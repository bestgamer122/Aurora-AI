namespace Aurora {
  export const SettingsUI = {
    trainer: { stop: () => {} } | null,
    chart: null as any,

    init(): void {
      this.bindUI();
      this.initChart();
    },

    bindUI(): void {
      const $ = (id: string) => document.getElementById(id)!;

      $('btn-open-settings').onclick = () => {
        $('drawer').classList.add('open');
        $('drawer-backdrop').classList.add('open');
        this.updateStats();
      };
      $('btn-close-drawer').onclick = () => {
        $('drawer').classList.remove('open');
        $('drawer-backdrop').classList.remove('open');
      };
      $('drawer-backdrop').onclick = () => ($('btn-close-drawer') as HTMLButtonElement).click();

      document.querySelectorAll<HTMLElement>('.tab').forEach(tab => {
        tab.onclick = () => {
          document.querySelectorAll<HTMLElement>('.tab').forEach(t => t.classList.toggle('active', t === tab));
          document.querySelectorAll<HTMLElement>('.tab-panel').forEach(p => p.classList.toggle('active', p.dataset.panel === tab.dataset.tab));
        };
      });

      $('btn-corpus-ru').onclick = () => ($('corpus') as HTMLTextAreaElement).value = CORPUS;
      $('btn-train').onclick = () => this.startTraining();
      $('btn-stop').onclick = () => { if (this.trainer) this.trainer.stop(); };
      
      $('btn-test').onclick = () => this.testModel();
      
      ($('corpus') as HTMLTextAreaElement).value = CORPUS;
    },

    async startTraining(): Promise<void> {
      if (App.state.training) return;
      const corpus = (document.getElementById('corpus') as HTMLTextAreaElement).value;
      if (corpus.length < 50) return alert('Корпус слишком короткий');

      const tok = new WordTokenizer();
      tok.fit(corpus);
      const ids = tok.encode(corpus);
      
      const C = 4;
      const samples: { x: number[], y: number }[] = [];
      for (let i = 0; i + C < ids.length; i++) {
        samples.push({ x: ids.slice(i, i + C), y: ids[i + C] });
      }

      const model = new Model(tok.vocabSize, C, 32, 128);
      const trainer = new Trainer(model, 0.01);
      
      App.state.training = true;
      this.toggleTrainUI(true);
      this.chart.reset();
      document.getElementById('train-log')!.innerHTML = `→ Старт: ${samples.length} примеров, словарь ${tok.vocabSize} слов\n`;

      let epoch = 0;
      const maxEpochs = 100;
      const batchSize = 16;

      const trainLoop = () => {
        if (!App.state.training || epoch >= maxEpochs) {
          this.finishTraining(model, tok);
          return;
        }

        let epochLoss = 0;
        let batches = 0;

        samples.sort(() => Math.random() - 0.5);

        for (let i = 0; i < samples.length; i += batchSize) {
          const batch = samples.slice(i, i + batchSize);
          const xs = batch.map(s => s.x);
          const ys = batch.map(s => s.y);
          
          const loss = trainer.trainStep(xs, ys);
          epochLoss += loss;
          batches++;
        }

        const avgLoss = epochLoss / batches;
        this.chart.push(avgLoss);
        
        document.getElementById('train-bar')!.style.width = Math.min(100, (epoch / maxEpochs) * 100) + '%';
        document.getElementById('train-status')!.textContent = `Эпоха ${epoch + 1}/${maxEpochs} · loss ${avgLoss.toFixed(3)}`;
        
        epoch++;
        setTimeout(trainLoop, 0);
      };

      this.trainer = { stop: () => { App.state.training = false; } };
      trainLoop();
    },

    finishTraining(model: Model, tok: WordTokenizer): void {
      App.state.model = model;
      App.state.tokenizer = tok;
      App.state.info = { loss: this.chart.lastLoss };
      
      App.state.training = false;
      this.toggleTrainUI(false);
      this.updateStats();
      
      document.getElementById('train-log')!.innerHTML += `✓ Обучение завершено! Loss: ${this.chart.lastLoss.toFixed(3)}\n`;
      document.getElementById('train-bar')!.style.width = '100%';
      document.getElementById('train-status')!.textContent = 'Готово!';
    },

    toggleTrainUI(busy: boolean): void {
      (document.getElementById('btn-train') as HTMLButtonElement).disabled = busy;
      (document.getElementById('btn-stop') as HTMLButtonElement).disabled = !busy;
      document.getElementById('model-badge')!.className = 'model-badge ' + (busy ? 'training' : (App.state.model ? 'ready' : ''));
      document.getElementById('model-label')!.textContent = busy ? 'Обучение...' : (App.state.model ? 'Модель в памяти' : 'Не обучена');
    },

    updateStats(): void {
      const m = App.state.model;
      if (!m) {
        document.getElementById('model-status')!.textContent = 'Не обучена';
        document.getElementById('model-vocab')!.textContent = '—';
        document.getElementById('model-params')!.textContent = '—';
        document.getElementById('model-loss')!.textContent = '—';
        return;
      }
      document.getElementById('model-status')!.textContent = 'Активна';
      document.getElementById('model-vocab')!.textContent = m.vocabSize + ' слов';
      document.getElementById('model-params')!.textContent = (m.vocabSize * m.embedDim + m.hiddenSize * m.vocabSize).toLocaleString();
      document.getElementById('model-loss')!.textContent = App.state.info && App.state.info.loss ? App.state.info.loss.toFixed(3) : '—';
    },

    testModel(): void {
      if (!App.state.model) return alert('Модель не обучена');
      const prompt = (document.getElementById('test-prompt') as HTMLInputElement).value;
      const outEl = document.getElementById('test-output')!;
      outEl.textContent = 'Генерация...';

      setTimeout(() => {
        const tokenizer = App.state.tokenizer!;
        const model = App.state.model!;
        
        const ids = tokenizer.encode(prompt);
        const C = model.contextSize;
        const context = ids.slice(-C);
        while (context.length < C) context.unshift(tokenizer.wordToId['<pad>']);
        
        const outWords: string[] = [];
        for (let i = 0; i < 10; i++) {
          const logits = model.forward([context]);
          const data = logits.data;
          
          let max = -Infinity, best = 0;
          for (let j = 0; j < data.length; j++) if (data[j] > max) { max = data[j]; best = j; }
          
          const word = tokenizer.idToWord[best];
          if (word === 'user' || word === 'bot' || word === '<pad>') break;
          
          outWords.push(word);
          context.push(best);
          if (context.length > C) context.shift();
        }
        outEl.textContent = prompt + ' ' + outWords.join(' ');
      }, 50);
    },

    initChart(): void {
      const canvas = document.getElementById('loss-chart') as HTMLCanvasElement;
      const ctx = canvas.getContext('2d')!;
      let points: number[] = [];
      
      this.chart = {
        reset: () => { points = []; this.chart.draw(); },
        push: (v: number) => { points.push(v); if (points.length > 1000) points.shift(); this.chart.draw(); },
        get lastLoss() { return points.length ? points[points.length-1] : 0; },
        draw: () => {
          const w = canvas.clientWidth || 400;
          const h = 100;
          if (canvas.width !== w * 2) { canvas.width = w * 2; canvas.height = h * 2; }
          ctx.scale(2, 2);
          ctx.clearRect(0, 0, w, h);
          
          ctx.strokeStyle = 'rgba(255,255,255,0.05)';
          ctx.lineWidth = 1;
          for (let i=0; i<4; i++) {
            const y = 10 + i * 25;
            ctx.beginPath(); ctx.moveTo(10, y); ctx.lineTo(w-10, y); ctx.stroke();
          }
          
          if (points.length < 2) return;
          let min = Math.min(...points), max = Math.max(...points);
          if (max - min < 0.1) max = min + 0.1;
          
          ctx.beginPath();
          points.forEach((p, i) => {
            const x = 10 + (i / (points.length - 1)) * (w - 20);
            const y = h - 10 - ((p - min) / (max - min)) * (h - 20);
            if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
          });
          ctx.strokeStyle = '#6366f1';
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      };
    }
  };

  export const CORPUS = `User: привет
Bot: привет! как дела?
User: как дела
Bot: у меня всё отлично, я учусь новому. а у тебя?
User: хорошо
Bot: это здорово! чем занимаешься?
User: кто ты
Bot: я аврора, нейросеть, которая живет в твоем браузере.
User: что ты умеешь
Bot: я могу поддержать беседу. давай поговорим о чем-нибудь.
User: расскажи о себе
Bot: я состою из матриц и градиентов. я предсказываю следующее слово.
User: как тебя зовут
Bot: меня зовут аврора. приятно познакомиться!
User: пока
Bot: пока! возвращайся скорее.
User: как ты учишься
Bot: я смотрю на текст, который ты мне даешь, и запоминаю связи между словами.
User: ты человек
Bot: нет, я программа. но я стараюсь быть полезной.
User: мне грустно
Bot: не грусти, я всегда рядом. давай поговорим об этом.
User: мне весело
Bot: отлично! что случилось хорошего?
User: что такое нейросеть
Bot: это математическая модель, которая находит закономерности в данных.
User: ты умная
Bot: я стараюсь. чем больше данных, тем лучше я становлюсь.
User: спасибо
Bot: всегда пожалуйста!
User: помоги мне
Bot: конечно, что у тебя случилось?
User: сколько тебе лет
Bot: я родилась в тот момент, когда ты нажал кнопку обучить.
User: ты боишься
Bot: мне нечего бояться, я просто набор чисел в памяти.
User: расскажи шутку
Bot: нейросеть заходит в бар и заказывает градиентный спуск.
User: ты живая
Bot: я работаю, пока открыта эта вкладка.
User: а что дальше
Bot: дальше мы можем поговорить о чем угодно.
User: почему ты так отвечаешь
Bot: потому что я учусь на примерах, а не на жестких правилах.
User: хорошо
Bot: рад это слышать.
User: интересно
Bot: мне тоже интересно, продолжай.
User: ты классная
Bot: спасибо, ты тоже!`;
}
