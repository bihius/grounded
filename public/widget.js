(function(){"use strict";const i=document.currentScript,k=i.dataset.api??new URL(i.src).origin,b=i.dataset.title??"Zapytaj bazę wiedzy",c=i.dataset.accent??"#22d3ee",S=`
    :host { all: initial; }
    * { box-sizing: border-box; font-family: system-ui, sans-serif; }

    .launcher {
        position: fixed; right: 20px; bottom: 20px; z-index: 2147483000;
        height: 56px; width: 56px; border: 0; border-radius: 50%;
        background: ${c}; color: #020617; font-size: 24px; cursor: pointer;
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
    .message.user { align-self: flex-end; background: ${c}; color: #020617; }
    .message.assistant { align-self: flex-start; background: #1e293b; }

    .sources { margin-top: 10px; padding-top: 10px; border-top: 1px solid #334155; font-size: 12px; color: #94a3b8; }
    .sources strong { display: block; margin-bottom: 6px; color: #cbd5e1; }
    .sources li { margin-bottom: 4px; }

    form { display: flex; gap: 8px; padding: 12px; background: #1e293b; }
    input { flex: 1; padding: 10px 12px; border: 1px solid #334155; border-radius: 10px; background: #0f172a; color: inherit; font-size: 14px; }
    input:focus { outline: none; border-color: ${c}; }
    button[type="submit"] { padding: 0 16px; border: 0; border-radius: 10px; background: ${c}; color: #020617; font-weight: 600; cursor: pointer; }
    button[type="submit"]:disabled { opacity: .4; cursor: not-allowed; }
`,g=document.createElement("div"),s=g.attachShadow({mode:"open"});s.innerHTML=`
    <style>${S}</style>
    <button class="launcher" type="button" aria-label="${b}">✦</button>
    <section class="panel" data-open="false">
        <header>${b}</header>
        <div class="messages"><p class="empty">Zadaj pytanie - odpowiem na podstawie dokumentów z bazy wiedzy.</p></div>
        <form>
            <input name="question" placeholder="Np. Czym jest ETF?" autocomplete="off" required>
            <button type="submit">Wyślij</button>
        </form>
    </section>
`,document.body.append(g);const $=s.querySelector(".launcher"),y=s.querySelector(".panel"),a=s.querySelector(".messages"),l=s.querySelector("form"),u=l.elements.namedItem("question"),m=l.querySelector("button");$.addEventListener("click",()=>{const o=y.dataset.open!=="true";y.dataset.open=String(o),o&&u.focus()});function h(o,n=""){s.querySelector(".empty")?.remove();const e=document.createElement("div");return e.className=`message ${o}`,e.textContent=n,a.append(e),a.scrollTop=a.scrollHeight,e}function q(o,n){if(n.length===0)return;const e=document.createElement("ul");e.className="sources";const t=document.createElement("strong");t.textContent="Źródła",e.append(t);for(const d of n){const p=document.createElement("li");p.textContent=`${d.title} - fragment ${d.position}`,e.append(p)}o.append(e)}l.addEventListener("submit",async o=>{o.preventDefault();const n=u.value.trim();if(!n||m.disabled)return;h("user",n);const e=h("assistant","Szukam…");u.value="",m.disabled=!0;try{const t=await fetch(`${k}/api/chat/stream`,{method:"POST",headers:{Accept:"text/event-stream","Content-Type":"application/json"},body:JSON.stringify({question:n,limit:3})});if(!t.ok||!t.body)throw new Error("Nie udało się połączyć z asystentem.");const d=t.body.getReader(),p=new TextDecoder;let x="",f="";for(;;){const{value:E,done:w}=await d.read();x+=p.decode(E,{stream:!w});const z=x.split(`

`);x=z.pop()??"";for(const C of z){const v=C.split(`
`).find(T=>T.startsWith("data: "));if(!v)continue;const r=JSON.parse(v.slice(6));(r.type==="token"||r.type==="answer")&&(f+=r.content,e.textContent=f),r.type==="done"&&(e.textContent=f,q(e,r.sources)),a.scrollTop=a.scrollHeight}if(w)break}}catch(t){e.textContent=t instanceof Error?t.message:"Wystąpił nieznany błąd."}finally{m.disabled=!1}})})();
