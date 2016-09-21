module.exports = {
  ptbrSentence: function(input){
    return /^[A-Za-záàâãéèêíïóôõöúçñÁÀÂÃÉÈÍÏÓÔÕÖÚÇÑ.!?,-: ]+$/.test(input);
  },
  ptbrTitle: function(input){
    return /^[A-Za-záàâãéèêíïóôõöúçñÁÀÂÃÉÈÍÏÓÔÕÖÚÇÑ ]+$/.test(input);
  },
  ptbrWord: function(input){
    return /^[A-Za-záàâãéèêíïóôõöúçñÁÀÂÃÉÈÍÏÓÔÕÖÚÇÑ]+$/.test(input);
  },
  hex: function(input){
    return /^[A-Fa-f0-9]+$/.test(input);
  },
  word: function(input){
    return /^\w+$/.test(input);
  },
  all: function(fn, arr){
    if (!(arr instanceof Array))
      return false;
    for (var i=0, l=arr.length; i<l; ++i)
      if (!fn(arr[i]))
        return false;
    return true;
  }
};
