namespace Aurora {
  export interface Param {
    w: Matrix;
    dw: Matrix;
    m: Matrix;
    v: Matrix;
  }

  export class Dense {
    public W: Matrix;
    public b: Matrix;
    public dW: Matrix;
    public db: Matrix;
    public mW: Matrix;
    public vW: Matrix;
    public mb: Matrix;
    public vb: Matrix;

    private x!: Matrix;
    private z!: Matrix;
    private a!: Matrix;

    constructor(public inS: number, public outS: number, public act: string) {
      const std = Math.sqrt(2 / inS);
      this.W = Matrix.random(inS, outS, std);
      this.b = Matrix.zeros(1, outS);
      
      this.dW = Matrix.zeros(inS, outS);
      this.db = Matrix.zeros(1, outS);
      this.mW = Matrix.zeros(inS, outS);
      this.vW = Matrix.zeros(inS, outS);
      this.mb = Matrix.zeros(1, outS);
      this.vb = Matrix.zeros(1, outS);
    }

    public forward(x: Matrix): Matrix {
      this.x = x;
      const z = Matrix.dot(x, this.W);
      Matrix.addRow(z, this.b);
      this.z = z;
      
      const a = Matrix.zeros(z.rows, z.cols);
      for (let i = 0; i < z.data.length; i++) {
        const v = z.data[i];
        if (this.act === 'relu') a.data[i] = v > 0 ? v : 0;
        else if (this.act === 'tanh') a.data[i] = Math.tanh(v);
        else a.data[i] = v;
      }
      this.a = a;
      return a;
    }

    public backward(dA: Matrix): Matrix {
      const dZ = Matrix.zeros(dA.rows, dA.cols);
      for (let i = 0; i < dA.data.length; i++) {
        const z = this.z.data[i];
        const a = this.a.data[i];
        const grad = this.act === 'relu' ? (z > 0 ? 1 : 0) : (this.act === 'tanh' ? 1 - a * a : 1);
        dZ.data[i] = dA.data[i] * grad;
      }
      
      this.dW = Matrix.dotTA(this.x, dZ);
      this.db = Matrix.colSum(dZ);
      return Matrix.dotTB(dZ, this.W);
    }

    public params(): Param[] {
      return [
        { w: this.W, dw: this.dW, m: this.mW, v: this.vW },
        { w: this.b, dw: this.db, m: this.mb, v: this.vb }
      ];
    }
  }

  export class Model {
    public E: Matrix;
    public dE: Matrix;
    public mE: Matrix;
    public vE: Matrix;
    
    public h1: Dense;
    public h2: Dense;

    private x!: Matrix;
    private ids!: number[][];

    constructor(
      public vocabSize: number,
      public contextSize: number,
      public embedDim: number,
      public hiddenSize: number
    ) {
      this.E = Matrix.random(vocabSize, embedDim, 0.1);
      this.dE = Matrix.zeros(vocabSize, embedDim);
      this.mE = Matrix.zeros(vocabSize, embedDim);
      this.vE = Matrix.zeros(vocabSize, embedDim);
      
      this.h1 = new Dense(contextSize * embedDim, hiddenSize, 'relu');
      this.h2 = new Dense(hiddenSize, vocabSize, 'linear');
    }

    public forward(ids: number[][]): Matrix {
      const B = ids.length;
      const C = this.contextSize;
      const D = this.embedDim;
      
      const x = Matrix.zeros(B, C * D);
      for (let i = 0; i < B; i++) {
        for (let c = 0; c < C; c++) {
          const id = ids[i][c];
          for (let d = 0; d < D; d++) {
            x.data[i * (C * D) + c * D + d] = this.E.data[id * D + d];
          }
        }
      }
      this.x = x;
      this.ids = ids;
      
      const h = this.h1.forward(x);
      return this.h2.forward(h);
    }

    public backward(dLogits: Matrix): void {
      const dh2 = this.h2.backward(dLogits);
      const dh1 = this.h1.backward(dh2);
      
      this.dE.fill(0);
      const B = this.ids.length;
      const C = this.contextSize;
      const D = this.embedDim;
      
      for (let i = 0; i < B; i++) {
        for (let c = 0; c < C; c++) {
          const id = this.ids[i][c];
          for (let d = 0; d < D; d++) {
            this.dE.data[id * D + d] += dh1.data[i * (C * D) + c * D + d];
          }
        }
      }
    }

    public params(): Param[] {
      return [
        { w: this.E, dw: this.dE, m: this.mE, v: this.vE },
        ...this.h1.params(),
        ...this.h2.params()
      ];
    }
  }
}
