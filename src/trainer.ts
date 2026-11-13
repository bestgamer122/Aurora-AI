namespace Aurora {
  export class Trainer {
    private t = 0;

    constructor(
      private model: Model,
      private lr: number = 0.01
    ) {}

    public trainStep(inputs: number[][], targets: number[]): number {
      const B = inputs.length;
      const V = this.model.vocabSize;
      
      const logits = this.model.forward(inputs);
      const probs = Matrix.zeros(B, V);
      let loss = 0;
      
      for (let i = 0; i < B; i++) {
        let max = -Infinity;
        for (let j = 0; j < V; j++) {
          const v = logits.data[i * V + j];
          if (v > max) max = v;
        }
        let sum = 0;
        for (let j = 0; j < V; j++) {
          const e = Math.exp(logits.data[i * V + j] - max);
          probs.data[i * V + j] = e;
          sum += e;
        }
        for (let j = 0; j < V; j++) probs.data[i * V + j] /= sum;
        
        loss += -Math.log(Math.max(probs.data[i * V + targets[i]], 1e-12));
        probs.data[i * V + targets[i]] -= 1;
      }
      
      loss /= B;
      for (let i = 0; i < probs.data.length; i++) probs.data[i] /= B;
      
      this.model.backward(probs);
      
      this.t++;
      const b1 = 0.9, b2 = 0.999, eps = 1e-8;
      const c1 = 1 - Math.pow(b1, this.t);
      const c2 = 1 - Math.pow(b2, this.t);
      
      this.model.params().forEach(p => {
        for (let i = 0; i < p.w.data.length; i++) {
          const g = p.dw.data[i];
          p.m.data[i] = b1 * p.m.data[i] + (1 - b1) * g;
          p.v.data[i] = b2 * p.v.data[i] + (1 - b2) * g * g;
          p.w.data[i] -= this.lr * (p.m.data[i] / c1) / (Math.sqrt(p.v.data[i] / c2) + eps);
        }
      });
      
      return loss;
    }
  }
}
