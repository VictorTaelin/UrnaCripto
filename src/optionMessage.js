module.exports = function optionMessage(referendum, option){
  return "Quanto ao referendo '"+referendum.id+"', "
        + "entitulado '"+referendum.title+"', "
        + "de proposta '"+referendum.proposal+"', "
        + "e opções "+referendum.options.map(function(opt){return "'"+opt+"'"}).join(", ")+", "
        + "eu voto na opção '"+option+"'.";
}
