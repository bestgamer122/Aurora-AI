namespace Aurora {
  export interface AppState {
    theme: string;
    chats: Chat[];
    activeId: string | null;
    model: Model | null;
    tokenizer: WordTokenizer | null;
    info: { loss: number } | null;
    training: boolean;
  }

  export const App = {
    state: {
      theme: 'dark',
      chats: [],
      activeId: null,
      model: null,
      tokenizer: null,
      info: null,
      training: false
    } as AppState,

    init(): void {
      this.loadState();
      this.bindUI();
      ChatUI.renderChats();
      ChatUI.renderMessages();
      SettingsUI.init();
      this.checkModel();
    },

    loadState(): void {
      try {
        const raw = localStorage.getItem('aurora_ts');
        if (raw) {
          const data = JSON.parse(raw);
          this.state.chats = data.chats || [];
          this.state.activeId = data.activeId || null;
          this.state.theme = data.theme || 'dark';
        }
      } catch {}
      
      if (!this.state.chats.length) this.newChat();
      document.documentElement.setAttribute('data-theme', this.state.theme);
    },

    saveState(): void {
      try {
        localStorage.setItem('aurora_ts', JSON.stringify({
          chats: this.state.chats,
          activeId: this.state.activeId,
          theme: this.state.theme
        }));
      } catch {}
    },

    newChat(): void {
      const chat: Chat = { id: Date.now().toString(), title: 'Новый чат', messages: [] };
      this.state.chats.unshift(chat);
      this.state.activeId = chat.id;
      this.saveState();
      if (window.ChatUI) {
        ChatUI.renderChats();
        ChatUI.renderMessages();
      }
    },

    checkModel(): void {
      document.getElementById('model-badge')!.className = 'model-badge ' + (this.state.model ? 'ready' : '');
      document.getElementById('model-label')!.textContent = this.state.model ? 'Модель в памяти' : 'Модель не обучена';
    },

    bindUI(): void {
      const $ = (id: string) => document.getElementById(id)!;

      $('btn-new-chat').onclick = () => this.newChat();
      $('btn-toggle-sidebar').onclick = () => $('sidebar').classList.toggle('open');
      
      $('btn-theme').onclick = () => {
        this.state.theme = this.state.theme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', this.state.theme);
        this.saveState();
      };

      const input = $('input') as HTMLTextAreaElement;
      input.addEventListener('input', () => {
        input.style.height = 'auto';
        input.style.height = Math.min(input.scrollHeight, 200) + 'px';
        ChatUI.updateSendButton();
      });
      
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          ChatUI.sendMessage();
        }
      });
      
      ($('composer') as HTMLFormElement).onsubmit = (e) => { e.preventDefault(); ChatUI.sendMessage(); };
    }
  };

  window.addEventListener('DOMContentLoaded', () => App.init());
}
