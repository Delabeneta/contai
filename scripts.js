// CONSTANTES
const CATS = ['Compra', 'Doação', 'Taxa', 'Outro'];
const CAT_CLASS = { 'Compra': 'b-compra', 'Doação': 'b-doacao', 'Taxa': 'b-taxa', 'Outro': 'b-outro' };
const BAR_CLASS = { 'Compra': 'bar-compra', 'Doação': 'bar-doacao', 'Taxa': 'bar-taxa', 'Outro': 'bar-outro' };
const PAGE_TITLES = { 
  novo: 'Novo evento', 
  historico: 'Histórico', 
  nota: 'Nota descritiva', 
  dashboard: 'Resumo geral' 
};

// ESTADO GLOBAL
let rows = [];
let rid = 0;
let editingId = null;

// ==================== STORAGE ====================
function loadEvents() {
  try {
    return JSON.parse(localStorage.getItem('contai_events') || '[]');
  } catch {
    return [];
  }
}

function saveEvents(evs) {
  localStorage.setItem('contai_events', JSON.stringify(evs));
}

// ==================== UTILIDADES ====================
function fmt(v) {
  return 'R$ ' + Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtNum(v) {
  return fmt(v);
}

function hoje() {
  return new Date().toISOString().split('T')[0];
}

function esc(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function toast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2200);
}

// ==================== NAVEGAÇÃO ====================
function goPage(name) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  
  document.getElementById('page-' + name).classList.add('active');
  const navBtn = document.querySelector(`.nav-btn[data-page="${name}"]`);
  if (navBtn) navBtn.classList.add('active');
  
  document.getElementById('page-title').textContent = PAGE_TITLES[name];
  document.getElementById('content').scrollTop = 0;
  
  if (name === 'historico') renderHistorico();
  if (name === 'nota') renderNotaPage();
  if (name === 'dashboard') renderDashboard();
}

// ==================== ITENS / TABELA ====================
function addRow(desc = '', cat = 'Compra', qty = 1, precoCusto = '', precoVenda = '') {
  rows.push({ 
    id: rid++, 
    desc, 
    cat, 
    qty: String(qty), 
    precoCusto: String(precoCusto),
    precoVenda: String(precoVenda)
  });
  renderRows();
}

function removeRow(id) {
  rows = rows.filter(r => r.id !== id);
  renderRows();
}

function updateField(id, field, val) {
  const r = rows.find(r => r.id === id);
  if (r) {
    r[field] = val;
    recalcSub(id);
    updateTotals();
  }
}

function recalcSub(id) {
  const r = rows.find(r => r.id === id);
  if (!r) return;
  const custoTotal = (parseFloat(r.qty) || 0) * (parseFloat(r.precoCusto) || 0);
  const faturamentoTotal = (parseFloat(r.qty) || 0) * (parseFloat(r.precoVenda) || 0);
  
  const elCusto = document.getElementById('custo-' + id);
  if (elCusto) {
    elCusto.textContent = custoTotal > 0 ? fmt(custoTotal) : '—';
    elCusto.className = 'sub-cell' + (custoTotal > 0 ? '' : ' sub-zero');
  }
  
  const elFat = document.getElementById('fat-' + id);
  if (elFat) {
    elFat.textContent = faturamentoTotal > 0 ? fmt(faturamentoTotal) : '—';
    elFat.className = 'sub-cell' + (faturamentoTotal > 0 ? '' : ' sub-zero');
  }
}

function mobileRecalc(id, card) {
  const r = rows.find(r => r.id === id);
  if (!r) return;
  const custoTotal = (parseFloat(r.qty) || 0) * (parseFloat(r.precoCusto) || 0);
  
  const el = card.querySelector(`#mcusto-${id}`);
  if (el) {
    el.textContent = custoTotal > 0 ? fmt(custoTotal) : '—';
    el.className = 'mi-sub' + (custoTotal > 0 ? '' : ' zero');
  }
  recalcSub(id);
}

function calcDesp() {
  return rows.reduce((s, r) => s + (parseFloat(r.qty) || 0) * (parseFloat(r.precoCusto) || 0), 0);
}

function calcFaturamento() {
  return rows.reduce((s, r) => s + (parseFloat(r.qty) || 0) * (parseFloat(r.precoVenda) || 0), 0);
}

function updateTotals() {
  const custoTotal = calcDesp();
  const faturamento = calcFaturamento();
  const resultado = faturamento - custoTotal;
  
  document.getElementById('m-desp').textContent = fmt(custoTotal);
  document.getElementById('m-faturamento').textContent = fmt(faturamento);
  document.getElementById('m-lucro').textContent = fmt(resultado);
  
  const el = document.getElementById('m-res-card');
  el.className = 'metric' + (resultado > 0 ? ' pos' : resultado < 0 ? ' neg' : '');
}

function renderRows() {
  const tbody = document.getElementById('items-body');
  const mobileEl = document.getElementById('mobile-items');
  
  if (!tbody || !mobileEl) return;
  
  tbody.innerHTML = '';
  mobileEl.innerHTML = '';

  rows.forEach(r => {
    const custoTotal = (parseFloat(r.qty) || 0) * (parseFloat(r.precoCusto) || 0);
    const faturamentoTotal = (parseFloat(r.qty) || 0) * (parseFloat(r.precoVenda) || 0);
    const catOpts = CATS.map(c => `<option${c === r.cat ? ' selected' : ''}>${c}</option>`).join('');

    // Desktop row
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><input class="td-input" type="text" value="${esc(r.desc)}" placeholder="Descrição..."
        oninput="updateField(${r.id},'desc',this.value)" /></td>
      <td><select class="td-select" onchange="updateField(${r.id},'cat',this.value)">${catOpts}</select></td>
      <td><input class="td-input" type="number" value="${r.qty}" min="1" step="1" style="text-align:center"
        oninput="updateField(${r.id},'qty',this.value)" /></td>
      <td><input class="td-input" type="number" value="${r.precoCusto}" min="0" step="0.01" placeholder="Preço custo"
        oninput="updateField(${r.id},'precoCusto',this.value)" /></td>
      <td><input class="td-input" type="number" value="${r.precoVenda}" min="0" step="0.01" placeholder="Preço venda"
        oninput="updateField(${r.id},'precoVenda',this.value)" /></td>
      <td class="sub-cell${custoTotal > 0 ? '' : ' sub-zero'}" id="custo-${r.id}">${custoTotal > 0 ? fmt(custoTotal) : '—'}</td>
      <td class="sub-cell${faturamentoTotal > 0 ? '' : ' sub-zero'}" id="fat-${r.id}">${faturamentoTotal > 0 ? fmt(faturamentoTotal) : '—'}</td>
      <td><button class="btn-del" onclick="removeRow(${r.id})">
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" width="13" height="13">
          <line x1="3" y1="3" x2="13" y2="13"/><line x1="13" y1="3" x2="3" y2="13"/>
        </svg></button></td>`;
    tbody.appendChild(tr);

    // Mobile card
    const div = document.createElement('div');
    div.className = 'mobile-item';
    div.innerHTML = `
      <div class="mi-row">
        <div class="mi-desc">
          <input type="text" value="${esc(r.desc)}" placeholder="Descrição do item..."
            oninput="updateField(${r.id},'desc',this.value);mobileRecalc(${r.id},this.closest('.mobile-item'))" />
        </div>
        <button class="btn-del" onclick="removeRow(${r.id})">
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" width="13" height="13">
            <line x1="3" y1="3" x2="13" y2="13"/><line x1="13" y1="3" x2="3" y2="13"/>
          </svg>
        </button>
      </div>
      <div class="mi-bottom">
        <select onchange="updateField(${r.id},'cat',this.value)">${catOpts}</select>
        <input type="number" value="${r.qty}" min="1" step="1" placeholder="Qtd"
          oninput="updateField(${r.id},'qty',this.value);mobileRecalc(${r.id},this.closest('.mobile-item'))" />
        <input type="number" value="${r.precoCusto}" min="0" step="0.01" placeholder="Custo"
          oninput="updateField(${r.id},'precoCusto',this.value);mobileRecalc(${r.id},this.closest('.mobile-item'))" />
        <input type="number" value="${r.precoVenda}" min="0" step="0.01" placeholder="Venda"
          oninput="updateField(${r.id},'precoVenda',this.value);mobileRecalc(${r.id},this.closest('.mobile-item'))" />
        <div class="mi-sub${custoTotal > 0 ? '' : ' zero'}" id="mcusto-${r.id}">${custoTotal > 0 ? fmt(custoTotal) : '—'}</div>
      </div>`;
    mobileEl.appendChild(div);
  });
  updateTotals();
}

// ==================== EVENTOS ====================
function salvarEvento() {
  const nome = document.getElementById('ev-nome').value.trim();
  if (!nome) {
    toast('Informe o nome do evento');
    return;
  }
  
  const evs = loadEvents();
  const ev = {
    id: editingId || Date.now().toString(),
    nome,
    data: document.getElementById('ev-data').value,
    resp: document.getElementById('ev-resp').value.trim(),
    obs: document.getElementById('ev-obs').value.trim(),
    items: rows.map(r => ({ 
      id: r.id,
      desc: r.desc,
      cat: r.cat,
      qty: r.qty,
      precoCusto: r.precoCusto,
      precoVenda: r.precoVenda
    })),
    savedAt: new Date().toISOString()
  };
  
  if (editingId) {
    const idx = evs.findIndex(e => e.id === editingId);
    if (idx >= 0) evs[idx] = ev;
    else evs.push(ev);
    toast('Evento atualizado!');
  } else {
    evs.unshift(ev);
    toast('Evento salvo!');
  }
  
  saveEvents(evs);
  editingId = null;
  limparFormulario();
}

function limparFormulario() {
  document.getElementById('ev-nome').value = '';
  document.getElementById('ev-resp').value = '';
  document.getElementById('ev-obs').value = '';
  document.getElementById('ev-data').value = hoje();
  
  rows = [];
  rid = 0;
  renderRows();
  addRow();
  addRow();
  addRow();
  
  editingId = null;
  document.getElementById('page-title').textContent = 'Novo evento';
}

function editarEvento(id) {
  const ev = loadEvents().find(e => e.id === id);
  if (!ev) return;
  
  editingId = id;
  document.getElementById('ev-nome').value = ev.nome;
  document.getElementById('ev-data').value = ev.data || hoje();
  document.getElementById('ev-resp').value = ev.resp || '';
  document.getElementById('ev-obs').value = ev.obs || '';
  
  rows = [];
  rid = 0;
  (ev.items || []).forEach(r => {
    rows.push({ 
      id: rid++,
      desc: r.desc || '',
      cat: r.cat || 'Compra',
      qty: r.qty || '1',
      precoCusto: r.precoCusto || '',
      precoVenda: r.precoVenda || ''
    });
  });
  if (rows.length === 0) {
    addRow();
    addRow();
    addRow();
  }
  renderRows();
  
  goPage('novo');
  document.getElementById('page-title').textContent = 'Editando evento';
  document.getElementById('content').scrollTop = 0;
}

function deletarEvento(id) {
  if (!confirm('Excluir este evento?')) return;
  const evs = loadEvents().filter(e => e.id !== id);
  saveEvents(evs);
  renderHistorico();
  toast('Evento excluído');
}

// ==================== HISTÓRICO ====================
function renderHistorico() {
  const evs = loadEvents();
  const el = document.getElementById('hist-lista');
  
  if (!evs.length) {
    el.innerHTML = `<div class="empty-state">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round">
        <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/>
        <rect x="9" y="3" width="6" height="4" rx="1"/>
      </svg>
      <p>Nenhum evento salvo ainda.<br>Crie seu primeiro evento na aba <strong>Novo</strong>.</p>
    </div>`;
    return;
  }
  
  el.innerHTML = evs.map(ev => {
    const desp = (ev.items || []).reduce((s, r) => s + (parseFloat(r.qty) || 0) * (parseFloat(r.precoCusto) || 0), 0);
    const fat = (ev.items || []).reduce((s, r) => s + (parseFloat(r.qty) || 0) * (parseFloat(r.precoVenda) || 0), 0);
    const lucro = fat - desp;
    const cls = lucro > 0 ? 'pos' : lucro < 0 ? 'neg' : 'neu';
    const dataFmt = ev.data ? new Date(ev.data + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
    const nitens = (ev.items || []).filter(r => r.desc).length;
    
    return `<div class="ev-card">
      <div class="ev-card-left">
        <div class="ev-card-nome">${esc(ev.nome)}</div>
        <div class="ev-card-sub">${dataFmt} · ${nitens} ite${nitens === 1 ? 'm' : 'ns'} · ${ev.resp || '—'}</div>
        <div class="ev-card-actions">
          <button class="btn-sec" style="padding:5px 12px;font-size:12px" onclick="editarEvento('${ev.id}')">Editar</button>
          <button class="btn-sec" style="padding:5px 12px;font-size:12px" onclick="verNota('${ev.id}')">Ver nota</button>
          <button class="ev-delete-btn" title="Excluir" onclick="deletarEvento('${ev.id}')">
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" width="14" height="14">
              <polyline points="3 4 13 4"/><path d="M5 4V3h6v1"/><path d="M4 4l1 10h6l1-10"/>
            </svg>
          </button>
        </div>
      </div>
      <div class="ev-card-right">
        <div class="ev-card-val ${cls}">${fmt(lucro)}</div>
        <div style="font-size:11px;color:var(--text3);margin-top:2px">resultado</div>
      </div>
    </div>`;
  }).join('');
}

function verNota(id) {
  const sel = document.getElementById('nota-select');
  sel.value = id;
  goPage('nota');
  renderNota();
}

// ==================== NOTA ====================
function renderNotaPage() {
  const evs = loadEvents();
  const sel = document.getElementById('nota-select');
  const cur = sel.value;
  sel.innerHTML = '<option value="">— Escolha um evento —</option>' +
    evs.map(e => `<option value="${e.id}"${e.id === cur ? ' selected' : ''}>${esc(e.nome)}</option>`).join('');
  renderNota();
}

function renderNota() {
  const id = document.getElementById('nota-select').value;
  const out = document.getElementById('nota-output');
  
  if (!id) {
    out.innerHTML = `<div class="select-ev-msg">Selecione um evento acima para gerar a nota.</div>`;
    return;
  }
  
  const ev = loadEvents().find(e => e.id === id);
  if (!ev) return;
  
  out.innerHTML = `<div class="card">
    <div class="card-title">Nota gerada</div>
    <div class="nota-pre" id="nota-pre-text">${gerarTextoNota(ev)}</div>
    <div class="actions-row" style="margin-top:10px">
      <button class="btn-sec" onclick="copiarNota()">Copiar texto</button>
      <button class="btn-sec" id="btn-pdf" onclick="baixarPDF()">Baixar PDF</button>
      <span class="copied-msg" id="copied-msg"></span>
    </div>
  </div>`;
}

function gerarTextoNota(ev) {
  const dataFmt = ev.data ? new Date(ev.data + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }) : '—';
  const desp = (ev.items || []).reduce((s, r) => s + (parseFloat(r.qty) || 0) * (parseFloat(r.precoCusto) || 0), 0);
  const fat = (ev.items || []).reduce((s, r) => s + (parseFloat(r.qty) || 0) * (parseFloat(r.precoVenda) || 0), 0);
  const lucro = fat - desp;
  const SEP = '─'.repeat(60);
  const SEP2 = '═'.repeat(60);
  
  const grupos = {};
  CATS.forEach(c => grupos[c] = []);
  (ev.items || []).filter(r => r.desc).forEach(r => {
    if (grupos[r.cat]) grupos[r.cat].push(r);
  });
  
  let linhas = '';
  CATS.forEach(cat => {
    const items = grupos[cat];
    if (!items.length) return;
    linhas += `\n  ${cat.toUpperCase()}\n`;
    items.forEach(r => {
      const sub = (parseFloat(r.qty) || 0) * (parseFloat(r.precoCusto) || 0);
      const desc = (r.desc || '').slice(0, 26).padEnd(26);
      const qtyStr = parseInt(r.qty) > 1 ? `${r.qty}x` : '  ';
      linhas += `  ${desc}  ${qtyStr.padStart(3)} ${fmt(parseFloat(r.precoCusto) || 0).padStart(12)}   ${fmt(sub).padStart(12)}\n`;
    });
  });
  
  let nota = `${SEP2}\n  MESA & CONTA — NOTA DESCRITIVA\n${SEP2}\n\n  Evento:       ${ev.nome}\n  Data:         ${dataFmt}\n  Responsável:  ${ev.resp || '—'}\n`;
  if (ev.obs) nota += `  Obs:          ${ev.obs}\n`;
  nota += `\n${SEP}\n  ITEM                        QTD   PREÇO CUSTO       CUSTO TOTAL\n${SEP}\n${linhas}\n${SEP}\n  Total de despesas (custo):                     ${fmt(desp).padStart(12)}\n  Faturamento bruto:                             ${fmt(fat).padStart(12)}\n${SEP2}\n  RESULTADO:                                     ${fmt(lucro).padStart(12)}\n${SEP2}\n\n  Gerado em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
  return nota;
}

function copiarNota() {
  const el = document.getElementById('nota-pre-text');
  if (!el) return;
  navigator.clipboard.writeText(el.textContent).then(() => {
    const m = document.getElementById('copied-msg');
    if (m) {
      m.textContent = 'Copiado!';
      m.style.display = 'block';
      setTimeout(() => m.style.display = 'none', 2000);
    }
  });
}


// ==================== PDF ====================
function baixarPDF() {
  const id = document.getElementById('nota-select').value;
  if (!id) {
    toast('Selecione um evento primeiro');
    return;
  }
  
  const ev = loadEvents().find(e => e.id === id);
  if (!ev) return;
  
  const btn = document.getElementById('btn-pdf');
  if (!btn) return;
  
  btn.textContent = 'Gerando...';
  btn.disabled = true;
  
  function gerar() {
    try {
      if (!window.jspdf) {
        throw new Error('Biblioteca não carregada');
      }
      
      const { jsPDF } = window.jspdf;
      // A4 retrato: 210 x 297mm
      const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
      const W = doc.internal.pageSize.getWidth(); // 210
      const H = doc.internal.pageSize.getHeight(); // 297
      const mx = 12;
      let y = 30;
      
      const cor = (r, g, b) => doc.setTextColor(r, g, b);
      const bold = () => doc.setFont('helvetica', 'bold');
      const normal = () => doc.setFont('helvetica', 'normal');
      
      const checkPage = (need = 6) => {
        if (y + need > H - 14) {
          doc.addPage();
          y = 16;
        }
      };
      
      // Cabeçalho
      doc.setFillColor(242, 238, 230);
      doc.rect(0, 0, W, 18, 'F');
      doc.setDrawColor(210, 203, 190);
      doc.setLineWidth(0.3);
      doc.line(0, 18, W, 18);
      bold();
      doc.setFontSize(13);
      cor(26, 23, 20);
      doc.text('Contai', mx, 10);
      normal();
      doc.setFontSize(6.5);
      cor(107, 101, 96);
      doc.text('NOTA DESCRITIVA DE EVENTO', mx, 15);
      
      // Dados do evento
      const dataFmt = ev.data ? new Date(ev.data + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
      bold();
      doc.setFontSize(10);
      cor(26, 23, 20);
      doc.text(ev.nome || 'Sem nome', mx, y);
      y += 5;
      normal();
      doc.setFontSize(7.5);
      cor(107, 101, 96);
      // Info numa linha só se couber
      let infoLine = dataFmt;
      if (ev.resp) infoLine += '   Resp: ' + ev.resp;
      doc.text(infoLine, mx, y);
      y += 4;
      if (ev.obs) {
        doc.text('Obs: ' + ev.obs.substring(0, 60), mx, y);
        y += 4;
      }
      y += 1;
      
      // Separador
      doc.setDrawColor(210, 205, 198);
      doc.setLineWidth(0.2);
      doc.line(mx, y, W - mx, y);
      y += 3;
      
      // Colunas ajustadas para A4 retrato (186mm úteis)
      // col1: ITEM (começa em mx=12, vai até col2)
      // larguras: Item=70, Qtd=12, Custo=28, Venda=28, CustoTot=28, Fat=rest
      const col1 = mx;          // ITEM: 12
      const col2 = mx + 70;     // QTD: 82
      const col3 = mx + 84;     // CUSTO UNIT: 96
      const col4 = mx + 112;    // VENDA UNIT: 124
      const col5 = mx + 140;    // CUSTO TOT: 152
      const col6 = W - mx;      // FATURAMENTO (direita): 198

      // Largura máxima para a descrição quebrar linha
      const maxDescWidth = col2 - col1 - 3;
      
      // Cabeçalho da tabela
      doc.setFillColor(240, 237, 231);
      doc.rect(mx, y - 2.5, W - mx * 2, 6, 'F');
      bold();
      doc.setFontSize(6);
      cor(80, 75, 70);
      doc.text('ITEM', col1 + 1, y);
      doc.text('QTD', col2 + 6, y, { align: 'center' });
      doc.text('CUSTO UNIT', col3 + 14, y, { align: 'center' });
      doc.text('VENDA UNIT', col4 + 14, y, { align: 'center' });
      doc.text('CUSTO TOT', col5 + 11, y, { align: 'center' });
      doc.text('FATURAMENTO', col6, y, { align: 'right' });
      y += 4.5;
      
      // Itens por categoria
      const grupos = {};
      CATS.forEach(c => grupos[c] = []);
      (ev.items || []).filter(r => r.desc).forEach(r => {
        if (grupos[r.cat]) grupos[r.cat].push(r);
      });
      
      let totalCusto = 0;
      let totalFaturamento = 0;
      let alt = false;
      const LINE_H = 4.0;  // altura de cada linha de texto
      const ROW_PAD = 1.5; // padding vertical por célula
      
      CATS.forEach(cat => {
        const items = grupos[cat];
        if (!items.length) return;
        checkPage(7);
        
        // Categoria header
        doc.setFillColor(248, 245, 240);
        doc.rect(mx, y - 2.5, W - mx * 2, 4.5, 'F');
        bold();
        doc.setFontSize(5.5);
        cor(100, 95, 90);
        doc.text(cat.toUpperCase(), mx + 2, y);
        y += 4;
        
        items.forEach(r => {
          const custoTotal = (parseFloat(r.qty) || 0) * (parseFloat(r.precoCusto) || 0);
          const faturamentoTotal = (parseFloat(r.qty) || 0) * (parseFloat(r.precoVenda) || 0);
          totalCusto += custoTotal;
          totalFaturamento += faturamentoTotal;

          // Quebra de linha do nome
          doc.setFontSize(7);
          normal();
          const descLines = doc.splitTextToSize(r.desc || '', maxDescWidth);
          const rowHeight = descLines.length * LINE_H + ROW_PAD * 2;

          checkPage(rowHeight + 2);

          if (alt) {
            doc.setFillColor(247, 244, 239);
            doc.rect(mx, y - ROW_PAD, W - mx * 2, rowHeight, 'F');
          }
          alt = !alt;
          
          // Centro vertical para valores numéricos
          const midY = y + (descLines.length - 1) * LINE_H / 2;

          // Descrição (com quebra de linha)
          normal();
          doc.setFontSize(7);
          cor(26, 23, 20);
          descLines.forEach((line, i) => {
            doc.text(line, col1 + 1, y + i * LINE_H);
          });
          
          // Valores numéricos
          cor(90, 85, 80);
          doc.setFontSize(6.5);
          doc.text(String(parseInt(r.qty) || 1), col2 + 6, midY, { align: 'center' });
          doc.text(fmtNum(parseFloat(r.precoCusto) || 0), col3 + 14, midY, { align: 'center' });
          doc.text(fmtNum(parseFloat(r.precoVenda) || 0), col4 + 14, midY, { align: 'center' });
          
          bold();
          cor(26, 23, 20);
          doc.setFontSize(7);
          doc.text(fmtNum(custoTotal), col5 + 11, midY, { align: 'center' });
          doc.text(fmtNum(faturamentoTotal), col6, midY, { align: 'right' });

          y += rowHeight;
        });
        y += 0.5;
      });
      
      y += 2;
      doc.setDrawColor(180, 175, 168);
      doc.line(mx, y, W - mx, y);
      y += 4;
      
      // Totais — label à esquerda do col5, valor alinhado à direita em col6
      const labelX = col5 - 2;

      normal();
      doc.setFontSize(7.5);
      cor(107, 101, 96);
      doc.text('Total de despesas:', labelX, y, { align: 'right' });
      bold();
      cor(26, 23, 20);
      doc.text(fmtNum(totalCusto), col6, y, { align: 'right' });
      y += 5;
      
      normal();
      doc.setFontSize(7.5);
      cor(107, 101, 96);
      doc.text('Faturamento bruto:', labelX, y, { align: 'right' });
      bold();
      cor(26, 23, 20);
      doc.text(fmtNum(totalFaturamento), col6, y, { align: 'right' });
      y += 4;
      
      doc.setDrawColor(180, 175, 168);
      doc.line(mx, y, W - mx, y);
      y += 4;
      
      // Resultado destacado
      const resultado = totalFaturamento - totalCusto;
      const resCor = resultado >= 0 ? [58, 107, 28] : [139, 32, 32];
      const resBg = resultado >= 0 ? [237, 243, 232] : [253, 240, 240];
      doc.setFillColor(...resBg);
      doc.rect(mx, y - 2, W - mx * 2, 8, 'F');
      bold();
      doc.setFontSize(9);
      cor(...resCor);
      doc.text('RESULTADO:', labelX, y + 3, { align: 'right' });
      doc.text(fmtNum(resultado), col6, y + 3, { align: 'right' });
      y += 11;
      
      // Rodapé
      normal();
      doc.setFontSize(6);
      cor(160, 153, 144);
      const agora = new Date().toLocaleDateString('pt-BR') + ' ' + new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      doc.text('Gerado em ' + agora + ' - Contai', mx, y);
      
      const nomeLimpo = (ev.nome || 'evento').replace(/[^a-zA-Z0-9 ]/g, '').trim().replace(/\s+/g, '_').slice(0, 40);
      doc.save('nota_' + nomeLimpo + '.pdf');
      toast('PDF gerado!');
    } catch (e) {
      console.error(e);
      toast('Erro ao gerar PDF: ' + e.message);
    }
    btn.textContent = 'Baixar PDF';
    btn.disabled = false;
  }
  
  if (window.jspdf) {
    gerar();
    return;
  }
  
  const s = document.createElement('script');
  s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
  s.onload = gerar;
  s.onerror = () => {
    toast('Erro ao carregar biblioteca PDF.');
    btn.textContent = 'Baixar PDF';
    btn.disabled = false;
  };
  document.head.appendChild(s);
}

// ==================== DASHBOARD ====================
function renderDashboard() {
  const evs = loadEvents();
  const el = document.getElementById('dash-content');
  
  if (!evs.length) {
    el.innerHTML = `<div class="empty-state" style="padding-top:4rem">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" width="48" height="48">
        <rect x="3" y="13" width="4" height="8" rx="1"/><rect x="10" y="8" width="4" height="13" rx="1"/><rect x="17" y="3" width="4" height="18" rx="1"/>
      </svg>
      <p style="margin-top:1rem">Nenhum evento salvo.<br>Os dados aparecem aqui após salvar eventos.</p>
    </div>`;
    return;
  }
  
  const totalDesp = evs.reduce((s, ev) => {
    return s + (ev.items || []).reduce((ss, r) => ss + (parseFloat(r.qty) || 0) * (parseFloat(r.precoCusto) || 0), 0);
  }, 0);
  const totalFat = evs.reduce((s, ev) => {
    return s + (ev.items || []).reduce((ss, r) => ss + (parseFloat(r.qty) || 0) * (parseFloat(r.precoVenda) || 0), 0);
  }, 0);
  const totalLucro = totalFat - totalDesp;
  const lucroClass = totalLucro >= 0 ? 'pos' : 'neg';
  
  // Por categoria
  const catTotals = {};
  CATS.forEach(c => catTotals[c] = 0);
  evs.forEach(ev => (ev.items || []).forEach(r => {
    const sub = (parseFloat(r.qty) || 0) * (parseFloat(r.precoCusto) || 0);
    if (catTotals[r.cat] !== undefined) catTotals[r.cat] += sub;
  }));
  const maxCat = Math.max(...Object.values(catTotals), 1);
  
  const barras = CATS.map(cat => {
    const pct = Math.round((catTotals[cat] / maxCat) * 100);
    return `<div class="cat-bar">
      <div class="cat-bar-label"><span>${cat}</span><span>${fmt(catTotals[cat])}</span></div>
      <div class="cat-bar-track"><div class="cat-bar-fill ${BAR_CLASS[cat]}" style="width:${pct}%"></div></div>
    </div>`;
  }).join('');
  
  const recentes = evs.slice(0, 5).map(ev => {
    const desp = (ev.items || []).reduce((s, r) => s + (parseFloat(r.qty) || 0) * (parseFloat(r.precoCusto) || 0), 0);
    const fat = (ev.items || []).reduce((s, r) => s + (parseFloat(r.qty) || 0) * (parseFloat(r.precoVenda) || 0), 0);
    const lucro = fat - desp;
    const cls = lucro > 0 ? 'pos' : lucro < 0 ? 'neg' : 'neu';
    return `<div style="display:flex;justify-content:space-between;align-items:center;padding:9px 0;border-bottom:1px solid var(--border)">
      <div>
        <div style="font-size:14px;font-weight:500">${esc(ev.nome)}</div>
        <div style="font-size:12px;color:var(--text3)">${ev.data ? new Date(ev.data + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }) : '—'}</div>
      </div>
      <div class="ev-card-val ${cls}" style="font-size:15px">${fmt(lucro)}</div>
    </div>`;
  }).join('');
  
  el.innerHTML = `
    <div class="card">
      <div class="card-title">Visão geral — ${evs.length} evento${evs.length > 1 ? 's' : ''}</div>
      <div class="dash-metrics">
        <div class="dash-metric">
          <div class="metric-label">Total de despesas</div>
          <div class="metric-value">${fmt(totalDesp)}</div>
        </div>
        <div class="dash-metric">
          <div class="metric-label">Faturamento total</div>
          <div class="metric-value">${fmt(totalFat)}</div>
        </div>
        <div class="dash-metric dash-big ${lucroClass}">
          <div class="metric-label">Resultado geral</div>
          <div class="metric-value" style="font-size:28px">${fmt(totalLucro)}</div>
        </div>
      </div>
    </div>
    <div class="card">
      <div class="card-title">Despesas por categoria</div>
      ${barras}
    </div>
    <div class="card">
      <div class="card-title">Eventos recentes</div>
      ${recentes}
    </div>`;
}

// ==================== EVENT LISTENERS ====================
function initEventListeners() {
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const page = btn.getAttribute('data-page');
      if (page) goPage(page);
    });
  });
  
  const salvarBtn = document.getElementById('salvar-evento');
  if (salvarBtn) salvarBtn.addEventListener('click', salvarEvento);
  
  const limparBtn = document.getElementById('limpar-form');
  if (limparBtn) limparBtn.addEventListener('click', limparFormulario);
  
  const addBtn = document.getElementById('add-row-btn');
  if (addBtn) addBtn.addEventListener('click', () => addRow());
  
  const notaSelect = document.getElementById('nota-select');
  if (notaSelect) notaSelect.addEventListener('change', renderNota);
}

// ==================== INICIALIZAÇÃO ====================
function init() {
  document.getElementById('ev-data').value = hoje();
  addRow();
  addRow();
  addRow();
  initEventListeners();
  renderDashboard();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}