var xhr = require("xhr");
var React = require("react");
var ReactDOM = require("react-dom");
var ItemList = require("./Components/ItemList.js");
var Page = require("./Components/Page.js");
var lrs = require("lrs");
var optionMessage = require("./optionMessage.js");

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
  componentDidMount: function(){
    if (window.location.pathname !== "/"){
      this.state.inputs.viewReferendum = window.location.pathname.slice(1);
      this.viewReferendum(false)();
    }
  },
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
  cleanState: function(){
    this.setState(this.getInitialState());
  },
  emptyImputs: function(){
    return this.getInitialState().inputs;
  }, 
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
  vote: function(){
    var reload = function(){
      location.reload();
      console.log("reloading");
    }.bind(this);
    var sign = function(){
      this.setState({showModal: <div>
        <p>Gerando assinatura criptográfica.</p>
        <p>Isso pode levar alguns instantes.</p>
      </div>});
      setTimeout(function(){
        var signature = lrs.sign(referendum.publicKeys, keys, optionMessage(referendum, option));
        xhr.post({
          "url": "/api/v1/referendums/"+this.state.referendum.id+"/vote",
          "headers": {"Content-Type": "application/json"},
          "body": JSON.stringify({option: option, signature: signature})},
          function(err,resp,body){
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
    var referendum = this.state.referendum;
    var login = this.state.inputs.newVoteLogin;
    var password = this.state.inputs.newVotePassword;
    var option = this.state.inputs.newVoteOption || this.state.referendum.options[0];
    var keys = {publicKey: null, privateKey: password};
    for (var i=0, l=referendum.voters.length; i<l; ++i)
      if (referendum.voters[i] === login)
        keys.publicKey = referendum.publicKeys[i];
    if (!keys.publicKey)
      return alert("Login inválido.");
    this.setState({showModal: <div>
      <p>Deseja assinar a seguinte declaração?</p>
      <p className="optionMessage">"{optionMessage(referendum, option)}"</p>
      <p><button onClick={sign}>Sim</button><button onClick={reload}>Não</button></p>
    </div>});
  },
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
  prove: function(){
    var referendum = this.state.referendum;

    var confirmMessage
      = "Desejar validar a prova do resultado do referendo "
      + "neste computador? Isso pode levar alguns minutos.";

    if (!confirm(confirmMessage))
      return;

    this.setState({output: "Seu computador está validando a prova do resultado. Por favor, aguarde."});

    setTimeout(function(){

      // Are all votes signed by a valid voter?
      for (var i=0, l=referendum.votes.length; i<l; ++i)
        if (!(lrs.verify(
            referendum.publicKeys,
            referendum.votes[i].signature,
            optionMessage(referendum, referendum.votes[i].option))))
          return alert("Esse resultado NÃO está correto. Foram encontrados votos inválidos!");

      // Are there no duplicate votes?
      for (var i=0, l=referendum.votes.length; i<l; ++i)
        for (var j=i+1; j<l; ++j)
          if (lrs.link(referendum.votes[i].signature, referendum.votes[j].signature))
            return alert("Esse resultado NÃO está correto. Foram encontrados votos duplicados!");

      // Then this result is correct.
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
        return "  - M["+i+"] = \""+optionMessage(referendum, vote.option)+"\"";
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
  viewVoters: function(){
    this.state.output 
      = "As partes identificadas pelos logins abaixo, e suas respectivas "
      + "chaves públicas, estão autorizadas a votar neste referendum:\n\n"
      + this.state.referendum.voters.map(function(voter,i){
        return "  - "+voter+": "+this.state.referendum.publicKeys[i];
      }.bind(this)).join("\n\n");
    this.forceUpdate();
  },
  hideOutput: function(){
    this.setState({output: ""});
  },
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
                <td>Login:</td>
                <td>{input("newVoteLogin")}</td>
              </tr>
              <tr>
                <td>Senha:</td>
                <td>{input("newVotePassword", true)}</td>
              </tr>
              <tr>
                <td>Opção:</td>
                <td>
                  <select onChange={function(e){
                      this.state.inputs.newVoteOption = e.target.value;
                    }.bind(this)}>
                    {referendum.options.map(function(option, i){
                      return <option key={i} value={option}>{option}</option>
                    })}
                  </select>
                </td>
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
