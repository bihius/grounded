(function(){"use strict";const i=document.currentScript,z=i.dataset.api??new URL(i.src).origin,x=i.dataset.title??"Zapytaj bazę wiedzy",d=i.dataset.accent??"#22d3ee",v=`
    :host { all: initial; }
    * { box-sizing: border-box; font-family: system-ui, sans-serif; }

    .launcher {
        position: fixed; right: 20px; bottom: 20px; z-index: 2147483000;
        height: 56px; width: 56px; border: 0; border-radius: 50%;
        background: ${d}; color: #020617; font-size: 24px; cursor: pointer;
        box-shadow: 0 10px 30px rgba(0, 0, 0, .35);
    }

    .panel {
        position: fixed; right: 20px; bottom: 88px; z-index: 2147483000;
        display: none; flex-direction: column;
        width: min(380px, calc(100vw - 40px)); height: min(560px, calc(100vh - 130px));
        border-radius: 16px; overflow: hidden; background: #0f172a; color: #e2e8f0;
        box-shadow: 0 20px 50px rgba(0, 0, 0, .45);
    }
    .panel[data-open="true"] { display: flex; }

    header { padding: 14px 16px; background: #1e293b; font-weight: 600; font-size: 15px; }

    .messages { flex: 1; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 12px; }
    .empty { margin: auto; text-align: center; color: #64748b; font-size: 14px; line-height: 1.5; }

    .message { max-width: 85%; padding: 10px 13px; border-radius: 14px; font-size: 14px; line-height: 1.55; white-space: pre-wrap; }
    .message.user { align-self: flex-end; background: ${d}; color: #020617; }
    .message.assistant { align-self: flex-start; background: #1e293b; }

    .sources { margin-top: 10px; padding-top: 10px; border-top: 1px solid #334155; font-size: 12px; color: #94a3b8; }
    .sources strong { display: block; margin-bottom: 6px; color: #cbd5e1; }
    .sources li { margin-bottom: 4px; }

    form { display: flex; gap: 8px; padding: 12px; background: #1e293b; }
    input { flex: 1; padding: 10px 12px; border: 1px solid #334155; border-radius: 10px; background: #0f172a; color: inherit; font-size: 14px; }
    input:focus { outline: none; border-color: ${d}; }
    button[type="submit"] { padding: 0 16px; border: 0; border-radius: 10px; background: ${d}; color: #020617; font-weight: 600; cursor: pointer; }
    button[type="submit"]:disabled { opacity: .4; cursor: not-allowed; }
`,b=document.createElement("div"),s=b.attachShadow({mode:"open"});s.innerHTML=`
    <style>${v}</style>
    <button class="launcher" type="button" aria-label="${x}">✦</button>
    <section class="panel" data-open="false">
        <header>${x}</header>
        <div class="messages"><p class="empty">Zadaj pytanie - odpowiem na podstawie dokumentów z bazy wiedzy.</p></div>
        <form>
            <input name="question" placeholder="Np. Czym jest ETF?" autocomplete="off" required>
            <button type="submit">Wyślij</button>
        </form>
    </section>
`,document.body.append(b);const k=s.querySelector(".launcher"),f=s.querySelector(".panel"),a=s.querySelector(".messages"),c=s.querySelector("form"),p=c.elements.namedItem("question"),l=c.querySelector("button");k.addEventListener("click",()=>{const o=f.dataset.open!=="true";f.dataset.open=String(o),o&&p.focus()});function g(o,n=""){s.querySelector(".empty")?.remove();const e=document.createElement("div");return e.className=`message ${o}`,e.textContent=n,a.append(e),a.scrollTop=a.scrollHeight,e}function S(o,n){if(n.length===0)return;const e=document.createElement("ul");e.className="sources",e.innerHTML=`<strong>Źródła</strong>${n.map(t=>`<li>${t.title} - fragment ${t.position}</li>`).join("")}`,o.append(e)}c.addEventListener("submit",async o=>{o.preventDefault();const n=p.value.trim();if(!n||l.disabled)return;g("user",n);const e=g("assistant","Szukam…");p.value="",l.disabled=!0;try{const t=await fetch(`${z}/api/chat/stream`,{method:"POST",headers:{Accept:"text/event-stream","Content-Type":"application/json"},body:JSON.stringify({question:n,limit:3})});if(!t.ok||!t.body)throw new Error("Nie udało się połączyć z asystentem.");const $=t.body.getReader(),q=new TextDecoder;let u="",m="";for(;;){const{value:E,done:y}=await $.read();u+=q.decode(E,{stream:!y});const h=u.split(`

`);u=h.pop()??"";for(const T of h){const w=T.split(`
`).find(j=>j.startsWith("data: "));if(!w)continue;const r=JSON.parse(w.slice(6));(r.type==="token"||r.type==="answer")&&(m+=r.content,e.textContent=m),r.type==="done"&&(e.textContent=m,S(e,r.sources)),a.scrollTop=a.scrollHeight}if(y)break}}catch(t){e.textContent=t instanceof Error?t.message:"Wystąpił nieznany błąd."}finally{l.disabled=!1}})})();
