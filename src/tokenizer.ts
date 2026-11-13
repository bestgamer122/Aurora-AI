namespace Aurora {
  export class WordTokenizer {
    public wordToId: { [key: string]: number } = {};
    public idToWord: string[] = [];

    public fit(text: string): void {
      const words = text.toLowerCase().match(/[a-zа-яё]+|[.,!?;]/gi) || [];
      const unique = ['<pad>', '<unk>', ...Array.from(new Set(words))];
      this.idToWord = unique;
      unique.forEach((w, i) => this.wordToId[w] = i);
    }

    public encode(text: string): number[] {
      const words = text.toLowerCase().match(/[a-zа-яё]+|[.,!?;]/gi) || [];
      return words.map(w => this.wordToId[w] !== undefined ? this.wordToId[w] : 1);
    }

    public decode(ids: number[]): string {
      return ids.map(id => this.idToWord[id] || '<unk>').join(' ');
    }

    public get vocabSize(): number {
      return this.idToWord.length;
    }
  }
}
