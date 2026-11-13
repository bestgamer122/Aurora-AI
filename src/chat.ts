namespace Aurora {
  export interface ChatMessage {
    role: 'user' | 'bot';
    text: string;
  }

  export interface Chat {
    id: string;
    title: string;
    messages: ChatMessage[];
  }

  export const ChatUI = {
    activeChat(): Chat | undefined {
      return App.state.chats.find(c => c.id === App.state.activeId);
    },

    renderChats(): void {
      const list = document.getElementById('chat-list')!;
      list.innerHTML = '';
      App.state.chats.forEach(c => {
        const el = document.createElement('div');
        el.className = 'chat-item' + (c.id === App.state.activeId ? ' active' : '');
        el.innerHTML = `<span class="title">${c.title || 'Чат'}</span><button class="del"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>`;
        
        el.addEventListener('click', () => {
          App.state.activeId = c.id;
          App.saveState();
          this.renderChats();
          this.renderMessages();
          document.getElementById('sidebar')!.classList.remove('open');
        });
        
        el.querySelector('.del')!.addEventListener('click', (e) => {
          e.stopPropagation();
          App.state.chats = App.state.chats.filter(x => x.id !== c.id);
          if (App.state.activeId === c.id) {
            App.state.activeId = App.state.chats.length ? App.state.chats[0].id : null;
          }
          App.saveState();
          this.renderChats();
          this.renderMessages();
        });
        
        list.appendChild(el);
      });
    },

    renderMessages(): void {
      const box = document.getElementById('messages')!;
      const chat = this.activeChat();
      box.innerHTML = '';
      document.getElementById('chat-title')!.textContent = chat ? chat.title : 'Aurora AI';

      if (!chat || !chat.messages.length) {
        box.innerHTML = `
          <div class="empty-state">
            <h1>Чем я могу помочь?</h1>
            <p>Спроси меня о чём-нибудь, или обучи свою нейросеть в настройках.</p>
          </div>`;
        return;
      }

      chat.messages.forEach(m => this.appendMsg(m.role, m.text));
      box.scrollTop = box.scrollHeight;
    },

    appendMsg(role: string, text: string): HTMLElement {
      const box = document.getElementById('messages')!;
      const el = document.createElement('div');
      el.className = `msg ${role}`;
      const avatar = role === 'user' ? 'U' : 'A';
      
      const html = text.replace(/\n/g, '<br>');
      el.innerHTML = `<div class="avatar">${avatar}</div><div class="bubble">${html}</div>`;
      
      box.appendChild(el);
      box.scrollTop = box.scrollHeight;
      return el;
    },

    sendMessage(): void {
      const input = document.getElementById('input') as HTMLTextAreaElement;
      const text = input.value.trim();
      if (!text || App.state.training || App.state.generating) return;

      const chat = this.activeChat();
      if (!chat) return;

      if (chat.messages.length === 0) chat.title = text.slice(0, 30);
      
      chat.messages.push({ role: 'user', text });
      input.value = '';
      input.style.height = 'auto';
      App.saveState();
      this.renderChats();
      this.renderMessages();
      
      App.state.generating = true;
      this.updateSendButton();

      const typingEl = this.appendMsg('bot', '<div class="typing"><span></span><span></span><span></span></div>');
      
      setTimeout(() => {
        typingEl.remove();
        this.generateReply(text);
      }, 800);
    },

    generateReply(userText: string): void {
      const chat = this.activeChat();
      if (!chat) return;

      if (!App.state.model || !App.state.tokenizer) {
        const msg: ChatMessage = { role: 'bot', text: 'Я ещё не обучена. Откройте настройки и нажмите «Запустить обучение».' };
        chat.messages.push(msg);
        App.saveState();
        this.appendMsg(msg.role, msg.text);
        App.state.generating = false;
        this.updateSendButton();
        return;
      }

      const prompt = `User: ${userText}\nBot:`;
      const el = this.appendMsg('bot', '<span class="cursor"></span>');
      const bubble = el.querySelector('.bubble') as HTMLElement;
      let fullText = '';

      setTimeout(() => {
        try {
          const tokenizer = App.state.tokenizer!;
          const model = App.state.model!;
          
          let ids = tokenizer.encode(prompt);
          if (ids.length === 0) ids = [tokenizer.wordToId['<pad>']];
          
          const C = model.contextSize;
          const context = ids.slice(-C);
          while (context.length < C) context.unshift(tokenizer.wordToId['<pad>']);
          
          const outWords: string[] = [];
          
          for (let i = 0; i < 15; i++) {
            const logits = model.forward([context]);
            const data = logits.data;
            
            const V = data.length;
            const indices = Array.from({length: V}, (_, i) => i);
            indices.sort((a, b) => data[b] - data[a]);
            const topK = indices.slice(0, 3);
            
            let max = -Infinity;
            topK.forEach(idx => { if (data[idx] > max) max = data[idx]; });
            
            let sum = 0;
            const probs = topK.map(idx => {
              const p = Math.exp((data[idx] - max) / 0.5);
              sum += p;
              return p;
            });
            
            let r = Math.random() * sum;
            let chosen = topK[0];
            for (let k = 0; k < topK.length; k++) {
              r -= probs[k];
              if (r <= 0) { chosen = topK[k]; break; }
            }
            
            const word = tokenizer.idToWord[chosen];
            if (word === 'user' || word === 'bot' || word === '<pad>') break;
            
            outWords.push(word);
            fullText = outWords.join(' ');
            bubble.innerHTML = fullText + '<span class="cursor"></span>';
            document.getElementById('messages')!.scrollTop = document.getElementById('messages')!.scrollHeight;
            
            context.push(chosen);
            if (context.length > C) context.shift();
          }

          if (!fullText.trim()) fullText = '...';
          bubble.innerHTML = fullText;
          chat.messages.push({ role: 'bot', text: fullText });
          App.saveState();
        } catch (e: any) {
          bubble.textContent = 'Ошибка генерации: ' + e.message;
        } finally {
          App.state.generating = false;
          this.updateSendButton();
        }
      }, 50);
    },

    updateSendButton(): void {
      const input = document.getElementById('input') as HTMLTextAreaElement;
      const btn = document.getElementById('btn-send') as HTMLButtonElement;
      btn.disabled = !input.value.trim() || App.state.generating;
      
      if (App.state.generating) {
        btn.classList.add('loading');
      } else {
        btn.classList.remove('loading');
      }
    }
  };
}
