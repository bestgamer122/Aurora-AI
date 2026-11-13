"use strict";
var Aurora;
(function (Aurora) {
    Aurora.App = {
        state: {
            theme: 'dark',
            chats: [],
            activeId: null,
            model: null,
            tokenizer: null,
            info: null,
            training: false,
            generating: false
        },
        init() {
            this.loadState();
            this.bindUI();
            Aurora.ChatUI.renderChats();
            Aurora.ChatUI.renderMessages();
            Aurora.SettingsUI.init();
            this.checkModel();
        },
        loadState() {
            try {
                const raw = localStorage.getItem('aurora_ts');
                if (raw) {
                    const data = JSON.parse(raw);
                    this.state.chats = data.chats || [];
                    this.state.activeId = data.activeId || null;
                    this.state.theme = data.theme || 'dark';
                }
            }
            catch (_a) { }
            if (!this.state.chats.length)
                this.newChat();
            document.documentElement.setAttribute('data-theme', this.state.theme);
        },
        saveState() {
            try {
                localStorage.setItem('aurora_ts', JSON.stringify({
                    chats: this.state.chats,
                    activeId: this.state.activeId,
                    theme: this.state.theme
                }));
            }
            catch (_a) { }
        },
        newChat() {
            const chat = { id: Date.now().toString(), title: 'Новый чат', messages: [] };
            this.state.chats.unshift(chat);
            this.state.activeId = chat.id;
            this.saveState();
            if (window.Aurora && Aurora.ChatUI) {
                Aurora.ChatUI.renderChats();
                Aurora.ChatUI.renderMessages();
            }
        },
        checkModel() {
            document.getElementById('model-badge').className = 'model-badge ' + (this.state.model ? 'ready' : '');
            document.getElementById('model-label').textContent = this.state.model ? 'Модель в памяти' : 'Модель не обучена';
        },
        bindUI() {
            const $ = (id) => document.getElementById(id);
            $('btn-new-chat').onclick = () => this.newChat();
            $('btn-toggle-sidebar').onclick = () => $('sidebar').classList.toggle('open');
            $('btn-theme').onclick = () => {
                this.state.theme = this.state.theme === 'dark' ? 'light' : 'dark';
                document.documentElement.setAttribute('data-theme', this.state.theme);
                this.saveState();
            };
            const input = $('input');
            input.addEventListener('input', () => {
                input.style.height = 'auto';
                input.style.height = Math.min(input.scrollHeight, 200) + 'px';
                Aurora.ChatUI.updateSendButton();
            });
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    Aurora.ChatUI.sendMessage();
                }
            });
            $('composer').onsubmit = (e) => { e.preventDefault(); Aurora.ChatUI.sendMessage(); };
        }
    };
    window.addEventListener('DOMContentLoaded', () => Aurora.App.init());
})(Aurora || (Aurora = {}));
