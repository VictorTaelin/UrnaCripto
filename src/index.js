// Esse é o client do UrnaCripto, em ReactJS. O código está levemente bagunçado
// e certamente poderia ser melhorado. De qualquer forma, é aqui que ficam as
// funções de validação, assinatura, etc. cruciais para o funcionamento do
// sistema, que tende a operar de maneira distribuída, sem assumir a segurança
// de um servidor central.

var xhr = require("xhr");
var React = require("react");
var ReactDOM = require("react-dom");
var ItemList = require("./Components/ItemList.js");
var Page = require("./Components/Page.js");
var lrs = require("lrs");
var declaration = require("./declaration.js");

var app = React.createClass({

  getInitialState: function(){
    return {
      referendum: null,
      output: "",
      showModal: null,
      inputs: {
        viewReferendum: "",
        viewVoter: "",
        newVoteLogin: "",
        newVoteOption: "",
        newVotePassword: "",
        newVoterLogin: "",
        newVoterKeys: null,
        newReferendumId: "",
        newReferendumTitle: "",
        newReferendumProposal: "",
        newReferendumOptions: "",
        newReferendumVoters: ""}
    };
  },

  // Verifica a presença de um referendo na url e pula para a devida página.
  componentDidMount: function(){
    if (window.location.pathname !== "/"){
      this.state.inputs.viewReferendum = window.location.pathname.slice(1);
      this.viewReferendum(false)();
    }
  },

  // Cria um novo referendo. Isso apenas envia os dados do referendo
  // para o servidor (usando sua API Rest) para que este possa
  // armazená-los e distribuí-los.
  createReferendum: function(){
    console.log("Creating referendum.");
    var inputs = this.state.inputs;
    xhr.post({
      "url": "/api/v1/referendums",
      "headers": {"Content-Type": "application/json"},
      "body": JSON.stringify({
        id: this.state.inputs.newReferendumId,
        title: this.state.inputs.newReferendumTitle,
        proposal: this.state.inputs.newReferendumProposal,
        options: this.state.inputs.newReferendumOptions,
        voters: this.state.inputs.newReferendumVoters
      })},
      function(err,resp,body){
        if (body === "Sucesso!"){
          alert("Referendo criado com sucesso.");
          location.reload();
        } else alert(body);
      }.bind(this));
  },

  // Util que reseta todo estado do site.
  cleanState: function(){
    this.setState(this.getInitialState());
  },

  // Util que apaga apenas os inputs.
  emptyImputs: function(){
    return this.getInitialState().inputs;
  }, 

  // Entra na página de um referendo. Utiliza a API do
  // servidor para saber se este referendo existe.
  viewReferendum: function(showAlert){
    return function(){
      xhr.get({
        "url": "/api/v1/referendums/"+this.state.inputs.viewReferendum},
        function(err,resp,body){
          if (!body && showAlert)
            alert("Referendo '"+this.state.inputs.viewReferendum+"' não encontrado.");
          else
            this.setState({referendum: JSON.parse(body)});
          this.setState({inputs: this.getInitialState().inputs});
        }.bind(this));
    }.bind(this);
  },

  // Visualiza a chave-pública de um eleitor
  // utilizando a API do servidor.
  viewVoter: function(){
    xhr.get({
      "url": "/api/v1/voters/"+this.state.inputs.viewVoter},
      function(err,resp,body){
        alert (!body
          ? "Eleitor '"+this.state.inputs.viewVoter+"' não encontrado."
          : "Eleitor '"+this.state.inputs.viewVoter+"' encontrado. "
            + "Sua chave pública é: " + body);
      }.bind(this));
  },

  // Assina um voto criptograficamente e envia esta assinatura para o servidor.
  vote: function(){

    // Função util para dar refresh na página.
    var reload = function(){
      location.reload();
      console.log("reloading");
    }.bind(this);

    // Função que cria a assinatura e envia para o servidor
    // (chamada após a confirmação do usuáiro).
    var sign = function(){

      // Primeiramente, mostramos a mensagem abaixo para o usuário.
      this.setState({showModal: <div>
        <p>Gerando assinatura criptográfica.</p>
        <p>Isso pode levar alguns instantes.</p>
      </div>});

      // O setTimeout permite que a mensagem seja mostrada antes
      // que o browser inicie a computação da assinatura.
      setTimeout(function(){

        // Essa é a chamada mais crítica do sistema. lrs.sign assina a sua 
        // declaração de voto, utilizando sua chave privada, em nome de todo
        // o grupo de eleitores, de tal modo que seja impossível determinar,
        // através da assinatura gerada, quem foi que a assinou. Isso pode levar
        // bastante tempo caso o grupo seja grande; seu tempo é linear. Existem
        // técnicas mais recentes que permitem assinaturas mais rápidas. A
        // implementação de lrs pode ser auditada em github.com/maiavictor/lrs
        var signature = lrs.sign(referendum.publicKeys, keys, declaration(referendum, option));

        // Aqui, enviamos essa assinatura para que o servidor armazene. Repare
        // que a senha (chave-privada) do usuário jamais é enviada para o
        // servidor; apenas a assinatura gerada com essa chave. Somente o
        // eleitor tem capacidade de forjar um voto válido em seu nome.
        xhr.post({
          "url": "/api/v1/referendums/"+this.state.referendum.id+"/vote",
          "headers": {"Content-Type": "application/json"},
          "body": JSON.stringify({option: option, signature: signature})},
          function(err,resp,body){
            // O resto é só UI e flores.
            if (body === "Sucesso!"){
              var receipt 
                = "Este documento comprova seu voto no referendo '"+referendum.id+"'. "
                + "Caso desconfie que ele foi desconsiderado na contagem "
                + "final, verifique se a assinatura abaixo consta na prova "
                + "do resultado. Caso negativo, houve fraude na contagem. "
                + "Divulgue este documento como prova. Assinatura:\n\n"
                + signature;
              var download = "data:text/plain;charset=utf-8,"+encodeURIComponent(receipt);
              this.setState({showModal: <div>
                <p>Voto confirmado!{"\u0020"}</p>
                <p><a className="modalLink" onClick={reload} href={download} download="comprovante.txt">
                    Clique aqui
                  </a>{"\u0020"}
                  para baixar o comprovante.
                </p>
              </div>});
            } else {
              this.setState({showModal: <div>
                <p>{body}</p>
              </div>});
              setTimeout(reload, 4000);
            };
          }.bind(this));
      }.bind(this), 1);
    }.bind(this);

    // Nomes mais curtos a algumas variáveis úteis.
    var referendum = this.state.referendum;
    var login = this.state.inputs.newVoteLogin;
    var password = this.state.inputs.newVotePassword;
    var option = this.state.inputs.newVoteOption || this.state.referendum.options[0];
    var keys = {publicKey: null, privateKey: password};

    // Encontramos a chave pública do usuário na lista.
    for (var i=0, l=referendum.voters.length; i<l; ++i)
      if (referendum.voters[i] === login)
        keys.publicKey = referendum.publicKeys[i];
    if (!keys.publicKey)
      return alert("Login inválido.");

    // Solicitamos do usuário a confirmação do vota.
    this.setState({showModal: <div>
      <p>Deseja assinar a seguinte declaração?</p>
      <p className="declaration">"{declaration(referendum, option)}"</p>
      <p><button onClick={sign}>Sim</button><button onClick={reload}>Não</button></p>
    </div>});
  },

  // Gera um par de chaves pública/privadas para o usuário, utilizando uma
  // fonte de entropia confiável (window.crypto). A chave pública é enviada
  // para o servidor e associada ao login do usuário, para que este possa
  // utilizar um login pequeno ao invés de uma chave pública gigante.
  generate: function(){
    var login = this.state.inputs.newVoterLogin;
    this.state.inputs.newVoterKeys = lrs.gen();
    xhr.post({
      "url": "/api/v1/voters",
      "headers": {"Content-Type": "application/json"},
      "body": JSON.stringify({
        login: login,
        publicKey: this.state.inputs.newVoterKeys.publicKey})},
      function(req, res){
        if (res.body === "Sucesso!")
          alert
            ( "Cadastro realizado com sucesso. Guarde seu login e senha:\n\n"
            + "Login: "+login+"\n"
            + "Senha: "+this.state.inputs.newVoterKeys.privateKey+"\n\n"
            + "* Para sua segurança, esta senha foi gerada offline e jamais transmitida "
            + "pela internet. Sendo assim, sua perda é irrecuperável. Recomenda-se "
            + "guardá-la em local seguro.");
        else
          alert(res.body);
      }.bind(this));
  },

  // Mostra os resultados do referendo, realizando
  // uma simples contagem das declarações de voto.
  results: function results(referendum){
    var opts = {};
    for (var i=0, l=referendum.options.length; i<l; ++i)
      opts[referendum.options[i]] = 0;
    for (var i=0, l=referendum.votes.length; i<l; ++i)
      ++opts[referendum.votes[i].option];
    var result = [];
    for (var opt in opts)
      result.push({option: opt, count: opts[opt]})
    return result;
  },

  // Essa é outra parte crítica do sistema. Aqui, realizamos uma
  // verificação independente da validez do referendo. Para isso,
  // precisamos checar se os 2 fatos apresentados na prova conferem;
  // ou seja, se todos os votos são válidos, e se nenhum eleitor
  // votou duas vezes. Para isso, são usadas as funções "verify" e
  // "link" propostas no esquema de assinaturas de anel encadeados.
  // Observe que ainda existe uma possibilidade de fraude não
  // verificada aqui: a do distribuidor de informação censurar
  // votos específicos para manipular o resultado. Por conta disso,
  // é necessário que os eleitores verifiquem que suas assinaturas
  // estão na prova do resultado. Se elas não estiverem, houve
  // manipulação. Basta um único eleitor mostrar uma assinatura
  // válida que não tenha sido distribuída pelo servidor para
  // invalidar a eleição. Um último ataque restante seria, obviamente,
  // uma desonestidade nesta própria função de validação. Por isso,
  // para garantir a segurança máxima, esse tipo de sistema requer
  // várias implementações independentes do procedimento abaixo.
  prove: function(){
    var referendum = this.state.referendum;

    var confirmMessage
      = "Desejar validar a prova do resultado do referendo "
      + "neste computador? Isso pode levar alguns minutos.";

    if (!confirm(confirmMessage))
      return;

    this.setState({output: "Seu computador está validando a prova do resultado. Por favor, aguarde."});

    setTimeout(function(){

      // Confere se todos os votos são válidos.
      for (var i=0, l=referendum.votes.length; i<l; ++i)
        if (!(lrs.verify(
            referendum.publicKeys,
            referendum.votes[i].signature,
            declaration(referendum, referendum.votes[i].option))))
          return alert("Esse resultado NÃO está correto. Foram encontrados votos inválidos!");

      // Confere se nenhum eleitor votou duas vezes.
      for (var i=0, l=referendum.votes.length; i<l; ++i)
        for (var j=i+1; j<l; ++j)
          if (lrs.link(referendum.votes[i].signature, referendum.votes[j].signature))
            return alert("Esse resultado NÃO está correto. Foram encontrados votos duplicados!");

      // Confirma a validez do resultado.
      this.setState({output
        : "Verificação realizada com sucesso. De acordo com os "
        + "procedimentos de validação e contagem implementados "
        + "neste aplicativo, o resultado deste referendo não "
        + "foi corrompido.\n\n"
        + "Para maior confiabilidade, recomenda-se vefiricar estes "
        + "mesmos dados através de uma implementação independente "
        + "das funções apresentadas em [1].\n\n"
        + "[1] Liu, Joseph K.; Wong, Duncan S. (2005). \"Linkable "
        + "ring signatures: Security models and new schemes\". ICCSA. "
        + "2: 614–623. doi:10.1007/11424826_65.\n"});
    }.bind(this), 1);

  },

  // Gera a prova de que a eleição está correta.
  // Essa função não verifia a prova, apenas cria
  // uma versão humanamente legível da mesma.
  viewProof: function(){
    var referendum = this.state.referendum;
    var l = referendum.votes.length;
    this.state.output
      = "Este documento prova que o "
      + "referendo de id '"+referendum.id+"' "
      + "e título '"+referendum.title+"', "
      + "realizado entre as partes identificadas por:\n\n"
      + referendum.voters.map(function(v){return "  - "+v}).join("\n")+"\n\n"
      + "teve, para a seguinte proposta:\n\n"
      + "  " + referendum.proposal + "\n\n"
      + "e, para as seguintes opções:\n\n"
      + referendum.options.map(function(v){return "  - "+v}).join("\n")+"\n\n"
      + "o seguinte resultado"+(l !== referendum.voters.length ? " parcial" : "")+":\n\n"
      + this.results(referendum).map(function(result,i){
          return "  - "+result.option+": "+result.count;
        }).join("\n")+"\n\n"
      + "conforme demonstrado pelo argumento que segue.\n"
      + "\n"
      + "Primeiramente, assumimos que cada uma das partes possui "
      + "exclusivo acesso à chave privada geradora das chaves públicas "
      + "abaixo listadas, conforme definido em [1]:\n"
      + "\n"
      + referendum.voters.map(function(voter,i){
        return "  - Parte: "+voter+"\n"
             + "    Chave pública: "+referendum.publicKeys[i]+"\n";
      }).join("\n")+"\n"
      + "Assumimos que essa correspondência havia sido concordada "
      + "previamente ao referendo, conforme recomendado.\n"
      + "\n"
      + "Sejam `PV(p)` e `PB(p)` as chaves privadas e públicas de uma "
      + "parte `p`, `M` uma mensagem arbitrária, e `ps` o conjunto de "
      + "chaves públicas acima mencionado. De acordo "
      + "com [1], apenas uma parte `p` , pertencente a `ps`, pode "
      + "forjar uma assinatura`S = sign(ps, [PV(p),PB(p)], M)` "
      + "de modo que `verify(ps, S, M)` seja verdadeiro. Ainda conforme "
      + "[1], sabe-se que revelar o autor de uma assinatura é tão difícil "
      + "quanto o problema do logaritmo discreto e, portanto, impraticável. "
      + "Finalmente, ainda conforme [1], se duas assinaturas `Sa` e `Sb` "
      + "foram assinadas pelo mesmo autor, então `link(Sa,Sb) == true`.\n"
      + "\n"
      + "Considere as seguintes mensagens:\n"
      + "\n"
      + referendum.votes.map(function(vote, i){
        return "  - M["+i+"] = \""+declaration(referendum, vote.option)+"\"";
      }).join("\n")+"\n"
      + "\n"
      + "Considere as seguintes assinaturas:\n"
      + "\n"
      + referendum.votes.map(function(vote, i){
        return "  - S["+i+"] = "+vote.signature;
      }).join("\n")+"\n"
      + "\n"
      + "Observamos os seguintes fatos:\n"
      + "\n"
      + "  - Fato #1: para todo inteiro i em {0.."+(l-1)+"}, verify(ps, S[i], M[i]) == true\n"
      + "  - Portanto, todas as mensagens acima foram assinadas por alguma parte listada.\n"
      + "\n"
      + "  - Fato #2: para todo inteiro i, j em {0.."+(l-1)+"}, se i != j, link(S[i], S[j]) == false\n"
      + "  - Portanto, nenhum par de mensagens acima foi assinado por uma mesma parte listada.\n"
      + "\n"
      + "Esses fatos podem ser validados através de qualquer implementação independente das funções "
      + "apresentadas em [1].\n"
      + "\n"
      + "Se cada assinatura demonstrada prova que um participante do referendo assinou uma, "
      + "e somente uma, mensagem declarando sua intenção de voto, e se o autor de cada assinatura "
      + "específica é secreto, conclui-se, portanto, que uma contagem simples destas declarações "
      + "de voto nos dá o verdadeiro e irrefutável resultado deste referendo, conforme se "
      + "queria demonstrar.\n"
      + "\n"
      + "[1] Liu, Joseph K.; Wong, Duncan S. (2005). \"Linkable "
      + "ring signatures: Security models and new schemes\". ICCSA. "
      + "2: 614–623. doi:10.1007/11424826_65.\n";
    this.forceUpdate();
  },

  // Mostra lista de eleitores e chaves públicas de um referendo.
  viewVoters: function(){
    this.state.output 
      = "As partes identificadas pelos logins abaixo, e suas respectivas "
      + "chaves públicas, estão autorizadas a votar neste referendum:\n\n"
      + this.state.referendum.voters.map(function(voter,i){
        return "  - "+voter+": "+this.state.referendum.publicKeys[i];
      }.bind(this)).join("\n\n");
    this.forceUpdate();
  },

  // Esconde a textarea com resultados de provas, etc.
  hideOutput: function(){
    this.setState({output: ""});
  },

  // Renderiza o HTML do site.
  render: function(){
    var input = function(field, password, onPressReturn){
      return <input
        value={this.state.inputs[field]||""}
        type={password ? "password" : "text"}
        onKeyPress={function(e){
          if (onPressReturn && e.which === 13)
            onPressReturn();
        }}
        onChange={function(e){
          this.state.inputs[field] = e.target.value;
          this.forceUpdate();
        }.bind(this)}/>
    }.bind(this);
    var referendum = this.state.referendum;
    var landingPage = referendum ? <div/> :
      <div>
        <h2 className="UrnaCriptoLogo" onClick={this.cleanState}>UrnaCripto</h2>
        <Page title="Visualizar referendo">
          <p>Id: {input("viewReferendum", false, this.viewReferendum(true))}</p>
          <button onClick={this.viewReferendum(true)}>View</button>
        </Page>
        <Page title="Cadastrar eleitor">
          <p>Login: {input("newVoterLogin", false, this.generate)}</p>
          <button onClick={this.generate}>Cadastrar</button>
        </Page>
        <Page title="Visualizar eleitor">
          <p>Login: {input("viewVoter", false, this.viewVoter)}</p>
          <button onClick={this.viewVoter}>Visualizar</button>
        </Page>
        <Page title="Criar referendo">
          <table>
            <tbody>
              <tr>
                <td>Id:</td>
                <td>{input("newReferendumId")}</td>
              </tr>
              <tr>
                <td>Título:</td>
                <td>{input("newReferendumTitle")}</td>
              </tr>
              <tr>
                <td>Proposta:</td>
                <td>{input("newReferendumProposal")}</td>
              </tr>
              <tr>
                <td>Opções:</td>
                <td>
                  <ItemList onUpdateList={function(list){
                    this.state.inputs.newReferendumOptions = list;
                  }.bind(this)}/>
                </td>
              </tr>
              <tr>
                <td>Eleitores:</td>
                <td>
                  <ItemList onUpdateList={function(list){
                    this.state.inputs.newReferendumVoters = list;
                  }.bind(this)}/>
                </td>
              </tr>
            </tbody>
          </table>
          <button onClick={this.createReferendum}>Criar</button>
        </Page>
        <Page title="Sobre a UrnaCripto">
          <p>
            <span>
              UrnaCripto é um sistema de referendos eletrônicos que utiliza
              de recentes avanços no campo da criptografia para tornar o
              processo eletivo incorruptível. Desde modo, é possível ter não
              somente convicção, mas provas irrefutáveis de fatos como a
              ausência de votos duplicados, a inviolabilidade do voto secreto e
              a exatidão da contagem final, sendo estas provas independentemente
              verificáveis por qualquer uma das partes envolvidas. Este projeto está
              em fase beta. Mais informações podem ser encontradas no
            </span>
            <span> </span>
            <a href="https://github.com/maiavictor/urnacripto">
              repositório oficial
            </a>.
          </p>
        </Page>
      </div>;
    var referendumPage = !referendum ? <div/> :
      <div>
        <h2 className="UrnaCriptoLogo" onClick={this.cleanState}>{referendum.title}</h2>
        <Page title="Proposta">
          <p>{referendum.proposal}</p>
        </Page>
        <Page title="Votar">
          <table>
            <tbody>
              <tr>
                <td>Opção:</td>
                <td>
                  <form>
                    {referendum.options.map(function(option, i){
                      var setVoteOption = function(e){
                        console.log(option);
                        this.state.inputs.newVoteOption = option;
                      }.bind(this);
                      return <p key={i}>
                        <input type="radio" onChange={setVoteOption} name="choice"/>
                        <span>{"\u00a0"}{option}</span>
                      </p>
                    }.bind(this))}
                  </form>
                </td>
              </tr>
              <tr>
                <td>Login:</td>
                <td>{input("newVoteLogin")}</td>
              </tr>
              <tr>
                <td>Senha:</td>
                <td>{input("newVotePassword", true)}</td>
              </tr>
            </tbody>
          </table>
          <button onClick={this.vote}>Votar!</button>
        </Page>
        <Page title="Resultado">
          <table>
            <tbody>{
              this.results(referendum).map(function(result,i){
                return <tr key={i}>
                  <td>- {result.option}: </td>
                  <td>{result.count}</td>
                </tr>;
              })
            }</tbody>
          </table>
          <p>({referendum.votes.length} / {referendum.voters.length} votaram)</p>
        </Page>
        <Page title="Prova" onToggle={this.hideOutput}>
          <div><button className="actionButton" onClick={this.viewVoters}>Mostre a lista de partes envolvidas.{"\u00a0"}</button></div>
          <div><button className="actionButton" onClick={this.viewProof}>Prove que o resultado está correto.{"\u00a0"}</button></div>
          <div><button className="actionButton" onClick={this.prove}>Verifique a prova neste computador.</button></div>
          {this.state.output ? 
            <div>
              <div>
                <textarea cols="40" rows="12" value={this.state.output} readOnly></textarea>
              </div>
              <div>
                <a download="documento.txt" href={"data:text/plain;charset=utf-8,"+encodeURIComponent(this.state.output)}>
                  Baixar
                </a>
              </div>
              <br/>
            </div> : ""}
        </Page>
      </div>;
    var modal = this.state.showModal ? <div className="modal">{this.state.showModal}</div> : <div/>;
    return <div id="app">
      {modal}
      {landingPage}
      {referendumPage}
    </div>;
  }
});

window.onload = function(){
  ReactDOM.render(
    React.createElement(app),
    document.getElementById("main"));
};
