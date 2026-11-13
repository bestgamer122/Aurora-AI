"use strict";
var Aurora;
(function (Aurora) {
    class WordTokenizer {
        constructor() {
            this.wordToId = {};
            this.idToWord = [];
        }
        fit(text) {
            const words = text.toLowerCase().match(/[a-zа-яё]+|[.,!?;]/gi) || [];
            const unique = ['<pad>', '<unk>', ...Array.from(new Set(words))];
            this.idToWord = unique;
            unique.forEach((w, i) => this.wordToId[w] = i);
        }
        encode(text) {
            const words = text.toLowerCase().match(/[a-zа-яё]+|[.,!?;]/gi) || [];
            return words.map(w => this.wordToId[w] !== undefined ? this.wordToId[w] : 1);
        }
        decode(ids) {
            return ids.map(id => this.idToWord[id] || '<unk>').join(' ');
        }
        get vocabSize() {
            return this.idToWord.length;
        }
    }
    Aurora.WordTokenizer = WordTokenizer;
})(Aurora || (Aurora = {}));
