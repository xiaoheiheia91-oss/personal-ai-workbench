function saveGoal(){localStorage.goal=goal.value;advice.innerText='AI建议：围绕主线推进，避免同时开启过多方向。'}
function ai(){reply.innerText='分析：先看目标、资源、风险和下一步行动。正式AI接入后这里会读取你的长期记录。'}
function saveNote(){let a=JSON.parse(localStorage.notes||'[]');a.push(note.value);localStorage.notes=JSON.stringify(a);render()}
function saveDecision(){let a=JSON.parse(localStorage.decisions||'[]');a.push(decision.value);localStorage.decisions=JSON.stringify(a);render()}
function render(){notes.innerHTML=(JSON.parse(localStorage.notes||'[]')).map(x=>'<div class=item>'+x+'</div>').join('');decisions.innerHTML=(JSON.parse(localStorage.decisions||'[]')).map(x=>'<div class=item>'+x+'</div>').join('')}
render()
