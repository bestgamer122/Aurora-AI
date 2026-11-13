"use strict";
var Aurora;
(function (Aurora) {
    class Dense {
        constructor(inS, outS, act) {
            this.inS = inS;
            this.outS = outS;
            this.act = act;
            const std = Math.sqrt(2 / inS);
            this.W = Aurora.Matrix.random(inS, outS, std);
            this.b = Aurora.Matrix.zeros(1, outS);
            this.dW = Aurora.Matrix.zeros(inS, outS);
            this.db = Aurora.Matrix.zeros(1, outS);
            this.mW = Aurora.Matrix.zeros(inS, outS);
            this.vW = Aurora.Matrix.zeros(inS, outS);
            this.mb = Aurora.Matrix.zeros(1, outS);
            this.vb = Aurora.Matrix.zeros(1, outS);
        }
        forward(x) {
            this.x = x;
            const z = Aurora.Matrix.dot(x, this.W);
            Aurora.Matrix.addRow(z, this.b);
            this.z = z;
            const a = Aurora.Matrix.zeros(z.rows, z.cols);
            for (let i = 0; i < z.data.length; i++) {
                const v = z.data[i];
                if (this.act === 'relu')
                    a.data[i] = v > 0 ? v : 0;
                else if (this.act === 'tanh')
                    a.data[i] = Math.tanh(v);
                else
                    a.data[i] = v;
            }
            this.a = a;
            return a;
        }
        backward(dA) {
            const dZ = Aurora.Matrix.zeros(dA.rows, dA.cols);
            for (let i = 0; i < dA.data.length; i++) {
                const z = this.z.data[i];
                const a = this.a.data[i];
                const grad = this.act === 'relu' ? (z > 0 ? 1 : 0) : (this.act === 'tanh' ? 1 - a * a : 1);
                dZ.data[i] = dA.data[i] * grad;
            }
            this.dW = Aurora.Matrix.dotTA(this.x, dZ);
            this.db = Aurora.Matrix.colSum(dZ);
            return Aurora.Matrix.dotTB(dZ, this.W);
        }
        params() {
            return [
                { w: this.W, dw: this.dW, m: this.mW, v: this.vW },
                { w: this.b, dw: this.db, m: this.mb, v: this.vb }
            ];
        }
    }
    Aurora.Dense = Dense;
    class Model {
        constructor(vocabSize, contextSize, embedDim, hiddenSize) {
            this.vocabSize = vocabSize;
            this.contextSize = contextSize;
            this.embedDim = embedDim;
            this.hiddenSize = hiddenSize;
            this.E = Aurora.Matrix.random(vocabSize, embedDim, 0.1);
            this.dE = Aurora.Matrix.zeros(vocabSize, embedDim);
            this.mE = Aurora.Matrix.zeros(vocabSize, embedDim);
            this.vE = Aurora.Matrix.zeros(vocabSize, embedDim);
            this.h1 = new Dense(contextSize * embedDim, hiddenSize, 'relu');
            this.h2 = new Dense(hiddenSize, vocabSize, 'linear');
        }
        forward(ids) {
            const B = ids.length;
            const C = this.contextSize;
            const D = this.embedDim;
            const x = Aurora.Matrix.zeros(B, C * D);
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
        backward(dLogits) {
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
        params() {
            return [
                { w: this.E, dw: this.dE, m: this.mE, v: this.vE },
                ...this.h1.params(),
                ...this.h2.params()
            ];
        }
    }
    Aurora.Model = Model;
})(Aurora || (Aurora = {}));
