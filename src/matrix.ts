namespace Aurora {
  export interface Matrix {
    rows: number;
    cols: number;
    data: Float32Array;
  }

  export const Matrix = {
    create: (r: number, c: number): Matrix => ({ rows: r, cols: c, data: new Float32Array(r * c) }),
    
    zeros: (r: number, c: number): Matrix => Matrix.create(r, c),

    random: (r: number, c: number, std: number): Matrix => {
      const m = Matrix.create(r, c);
      for (let i = 0; i < m.data.length; i++) {
        let u = 0, v = 0;
        while (u === 0) u = Math.random();
        while (v === 0) v = Math.random();
        m.data[i] = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v) * std;
      }
      return m;
    },

    addRow: (m: Matrix, v: Matrix): void => {
      for (let i = 0; i < m.rows; i++) {
        for (let j = 0; j < m.cols; j++) m.data[i * m.cols + j] += v.data[j];
      }
    },

    dot: (a: Matrix, b: Matrix): Matrix => {
      const out = Matrix.zeros(a.rows, b.cols);
      for (let i = 0; i < a.rows; i++) {
        for (let k = 0; k < a.cols; k++) {
          const av = a.data[i * a.cols + k];
          if (av === 0) continue;
          for (let j = 0; j < b.cols; j++) {
            out.data[i * b.cols + j] += av * b.data[k * b.cols + j];
          }
        }
      }
      return out;
    },

    dotTA: (a: Matrix, b: Matrix): Matrix => {
      const out = Matrix.zeros(a.cols, b.cols);
      for (let i = 0; i < a.rows; i++) {
        for (let k = 0; k < a.cols; k++) {
          const av = a.data[i * a.cols + k];
          if (av === 0) continue;
          for (let j = 0; j < b.cols; j++) {
            out.data[k * b.cols + j] += av * b.data[i * b.cols + j];
          }
        }
      }
      return out;
    },

    dotTB: (a: Matrix, b: Matrix): Matrix => {
      const out = Matrix.zeros(a.rows, b.rows);
      for (let i = 0; i < a.rows; i++) {
        for (let j = 0; j < b.rows; j++) {
          let sum = 0;
          for (let k = 0; k < a.cols; k++) sum += a.data[i * a.cols + k] * b.data[j * b.cols + k];
          out.data[i * b.rows + j] = sum;
        }
      }
      return out;
    },

    colSum: (m: Matrix): Matrix => {
      const out = Matrix.zeros(1, m.cols);
      for (let i = 0; i < m.rows; i++) {
        for (let j = 0; j < m.cols; j++) out.data[j] += m.data[i * m.cols + j];
      }
      return out;
    }
  };
}
