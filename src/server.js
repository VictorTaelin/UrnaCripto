// Esse é o servidor do UrnaCripto. Ele utiliza Express para servir o client
// (index.html) e para fornecer uma API rest para que o mesmo possa interagir
// com o sistema. Repare que este arquivo é bem pequeno: de fato, o servidor
// não faz quase nada além de armazenar e distribuir dados públicos. Toda a
// validação crítica é realizada pelos clients, de forma distribuída. Por conta
// disso, invadir esse servidor é completamente inofensivo e não acarreta
// nenhum tipo de problema de segurança.

var express = require("express");
var lrs = require("lrs");
var app = express();
var bodyParser = require("body-parser");
var declaration = require("./declaration.js");
var valid = require("./valid.js");
var fs = require("fs");
var state 
  = fs.existsSync("./state.json")
  ? JSON.parse(fs.readFileSync("state.json", "utf8"))
  : {referendums: {}, voters: {}};
var referendums = state.referendums;
var voters = state.voters;

// Habilita parseamento de parametros de request POST.
app.use(bodyParser());

// Adiciona um novo eleitor, ou seja, um id associado a uma chave pública.
app.post("/api/v1/voters", function(req, res){
  if (!valid.word(req.body.login))
    return res.send("O login deve conter apenas caracteres a-z, A-Z, 0-9, _.");
  if (!valid.hex(req.body.publicKey))
    return res.send("Chave pública mal formatada.");
  if (voters[req.body.login])
    return res.send("Este login já existe.")
  voters[req.body.login] = req.body.publicKey;
  res.send("Sucesso!");
});

// Retorna a chave pública de um eleitor.
app.get("/api/v1/voters/:login", function(req, res){
  res.send(voters[req.params.login]);
});

// Cria um novo referendo.
app.post("/api/v1/referendums", function(req, res){
  var referendum = req.body;
  if (referendums[referendum.id])
    return res.send("Já existe um referendo com esse id.");
  if (!valid.word(referendum.id))
    return res.send("O id só pode conter os caracteres a-z, A-Z, 0-9, _.");
  if (!valid.ptbrTitle(referendum.title))
    return res.send("O título não pode conter caracteres especiais.");
  if (!valid.ptbrSentence(referendum.proposal))
    return res.send("Proposta possui caracteres inválidos.");
  if (!valid.all(valid.ptbrTitle, referendum.options))
    return res.send("Opções possuem caracteres inválidos.");
  if (!valid.all(valid.word, referendum.voters))
    return res.send("Eleitores inválidos.");
  for (var i=0, l=referendum.voters.length; i<l; ++i)
    if (!voters[referendum.voters[i]])
      return res.send(referendum.voters[i]+" não é um eleitor válido.");
  referendums[referendum.id] = {
    id: referendum.id,
    title: referendum.title,
    proposal: referendum.proposal,
    options: referendum.options,
    voters: referendum.voters,
    publicKeys: referendum.voters.map(function(voter){ return voters[voter]; }), 
    votes: []};
  res.send("Sucesso!");
});

// Retorna toda a informação associada a um referendo, incluindo
// título, proposta, opções, participantes e votos assinados.
// Repare, novamente, que não existe nenhuma informação privada.
app.get("/api/v1/referendums/:id", function(req, res){
  res.send(JSON.stringify(referendums[req.params.id]));
});

// Recebe e armazena um novo voto assinado. Nesta função, o servidor realiza
// uma validação criptográfica do voto exclusivamente para diminuir o trabalho
// realizado pelos clients. Este poderia, opcionalmente, armazenar a assinatura
// sem qualquer tipo de validação.
app.post("/api/v1/referendums/:id/vote", function(req, res){
  var vote = req.body;
  var referendum = referendums[req.params.id];
  var votes = referendum.votes;
  if (!referendum)
    return res.send("Referendo não encontrado.");
  if (referendum.options.indexOf(vote.option) === -1)
    return res.send("Opção inválida.");
  if (!lrs.verify(referendum.publicKeys, vote.signature, declaration(referendum, vote.option)))
    return res.send("Assinatura criptográfica inválida (sua senha deve corresponder a um login autorizado a votar neste referendum).");
  for (var i=0, l=referendum.votes.length; i<l; ++i)
    if (lrs.link(referendum.votes[i].signature, vote.signature))
      return res.send("Você já votou.");
  referendum.votes.push(vote);
  res.send("Sucesso!");
});

// Serve o client (index.html).
app.get(/^\/[a-zA-Z][a-zA-Z_0-9]*$/, function (req, res) {
    res.sendfile("app/index.html");
});

// Configurações de porta.
var port = process.argv[2] || 30000;
app.use(express.static("./app"));
app.listen(port, function(){
  console.log("Listening on port "+port+".");
});

// Salva o estado a cada 60 segundos em disco. Um banco de dados
// não é usado devido à complexidade adicional. Como os dados são
// simples e não críticos, um arquivo serve bem.
setInterval(function(){
  fs.writeFile("./state.json", JSON.stringify(state), function(err){
    if (err) console.log("Error saving state.json: "+err);
  });
}, 60000);
