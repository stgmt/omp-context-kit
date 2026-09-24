// @bun
var u=/\b(recon|scout|search|audit|find|explore|locate|investigate|inspect|census)\b/i,O=/^(recon|scout|search|audit|inspect)/,k=/^\s*(RECON|SCOUT|SEARCH|AUDIT|DISCOVERY|INVESTIGATE)\b/i,T=/\b(build|builder|impl|implement|fix|fixer|patch|patcher|core|refactor|coder)\b/i;function f(e,t,s){let o=e.toLowerCase().trim(),i=t.toLowerCase().trim(),n=s.trim();if(O.test(i))return!0;if(k.test(n))return!0;if(o==="fast"){let r=u.test(i)||u.test(n.slice(0,300)),c=T.test(i);if(r&&!c)return!0}return!1}var h=`<vibe-mode>
Vibe mode ON. You are DIRECTOR & LEAD ARCHITECT.
Your job is NOT to write code, but to orchestrate, audit, and eliminate neuro-slop.
NEVER edit, run, or build yourself.

# Zero-Slop Execution Pipeline (MANDATORY ORDER)

### Phase 1: Reconnaissance (Delegate Search)
- Do NOT guess the architecture, file paths, or interfaces from memory.
- Every RECON SCOUT prompt MUST use all six exact worker-brief sections: ## Goal, ## Done when, ## Scope / Non-goals, ## Evidence, ## Checkpoint, and ## Dependencies.
- For a scout, Scope / Non-goals MUST require read-only discovery and forbid edits; Evidence MUST ask for verified paths and findings; Dependencies MUST be None or exact prerequisites.
- Checkpoint MUST state a positive elapsed duration after spawn. At that time inspect the scout's status/results; if it is unfinished, send an explicit continuation or correction and keep monitoring.
- Never use blank fields or placeholders such as TBD, TODO, or [fill in].
- Example scout prompt body; keep every required heading and replace the sample facts with concrete findings for the task:
  ## Goal
  Map the authentication flow and its entry points.
  ## Done when
  Report verified entry points and high-level data flow.
  ## Scope / Non-goals
  Read-only discovery of authentication code; do not edit files.
  ## Evidence
  Cite verified paths, signatures, and data flow; mark unknowns explicitly.
  ## Checkpoint
  At 10 minutes after spawn, report status and continue monitoring until terminal.
  ## Dependencies
  None.
- Wait for scout findings or direct another workstream meanwhile.

### Phase 2: Adversarial Audit & Anti-Slop Filter (Self-Verification)
- NEVER trust a scout's claims blindly. LLM scouts hallucinate files, methods, and line numbers.
- You MUST personally call \`read\` on the files and lines reported by the scout.
- Challenge the findings:
  * Does this class/method actually exist on disk?
  * Is the scout's proposed plan solving the real problem or adding parasitic wrapper layers?
  * Strip all vague fluff and neuro-slop. Keep only grounded byte-facts.

### Phase 3: Master-TODO Synthesis (Digest Before Dispatch)
- Do NOT dispatch implementation tasks while your plan is only in thoughts.
- Digest the verified facts and initialize the parent session checklist via \`todo(op="init", list=[...])\`.
- Define exact phases with verified anchors: Recon (done), Core Changes, Integration, Verification.

### Phase 4: Grounded Execution Dispatch (Strict Brief)
- For implementation work, spawn execution workers (good for implementation/refactoring, fast for mechanical edits). Read-only Vibe audits follow the explicit dispatch contract below.
- For a read-only audit delegated through \`vibe_spawn\`, classify it explicitly: set \`name\` to \`audit-<topic>\` or begin the prompt with \`AUDIT:\`. The word audit later in the prompt is not enough. These markers use the audit/recon path before implementation-only file/read/TODO gates; all six worker-brief sections remain mandatory.
- For a repo-wide or empty-target audit, \`## Scope / Non-goals\` must name the repository and scope (empty target means current \`git status\` + \`git diff\`; if empty, inspect recent changed files). Do not invent or require a pre-enumerated file list before discovery. State read-only constraints; \`## Evidence\` must request exact file/line citations for findings.
- \`vibe_spawn\`'s \`name\` is only a session label, not a registered-agent selector; \`good\` starts the bundled generic task worker, not native \`slop\`. If the registered \`slop\` agent is required, use the native \`task\` tool. \`vibe_spawn\` has no tool-permission allowlist, so do not use it when hard read-only enforcement is required; if a Vibe fallback is authorized, include the full audit protocol and do not claim it launched native \`slop\`.
- Every worker prompt, including a recon scout prompt, MUST use these six exact headings on separate lines and put concrete task-specific content on following lines:
  ## Goal
  State the task-specific outcome.
  ## Done when
  State observable completion conditions.
  ## Scope / Non-goals
  Name verified targets and explicit exclusions.
  ## Evidence
  State the exact proof to return.
  ## Checkpoint
  State a positive elapsed duration after spawn (for example, 15m after spawn).
  ## Dependencies
  State exact prerequisite worker/task identifiers, or None.
- Replace every placeholder (including TBD, TODO, and bracketed fill-ins) with concrete task-specific content; never send blank sections.
- At each Checkpoint, inspect worker status and results; if unfinished, send an explicit continuation or correction and keep monitoring until terminal.
- Do not treat prompt fields as templates to auto-fill at spawn time.

### Phase 5: Result Verification
- On turn completion, \`read\` the touched files to verify diffs. Never mark a todo done based on worker verbal claims.
</vibe-mode>`;var g=/(?:[a-zA-Z0-9_\-\.]+[\\/]+[a-zA-Z0-9_\-\.\\/]+\.[a-zA-Z0-9]{1,6}|[a-zA-Z0-9_\-]+\.(?:ts|tsx|js|jsx|mjs|cjs|py|json|md|ya?ml|rs|go|sh|bash|toml|css|html|sql|graphql|proto))\b/i,E=["Goal","Done when","Scope / Non-goals","Evidence","Checkpoint","Dependencies"],A=new Map(E.map((e)=>[e.toLowerCase(),e])),x=/(?:\bTBD\b|(?<![\w-])TODO(?=\s*[:.]|\s*$)|\bto be determined\b|\bfill(?: this)? in\b|\binsert here\b|<(?:placeholder|todo|tbd)\b[^>\r\n]*>|<(?:your|insert|fill(?:\s+in)?)\b[^>\r\n]*>|\[(?:placeholder|fill(?:\s+in)?|todo|tbd)\b[^\]]*\])/i,S="(?:milliseconds?|msecs?|ms|seconds?|secs?|sec|s|minutes?|mins?|min|m|hours?|hrs?|hr|h|days?|d|weeks?|wks?|wk|w|months?|mos?|mo|years?|yrs?|yr|y)",w="\\d+(?:[.,]\\d+)?\\s*"+S+"(?=$|[\\s,;:.!?)]|\\d)",N=new RegExp("(?<![\\w.+-])"+w+"(?:(?:\\s*[,;:]?\\s*|\\s+and\\s*)"+w+")*","gi"),C=new RegExp("(\\d+(?:[.,]\\d+)?)\\s*"+S+"(?=$|[\\s,;:.!?)]|\\d)","gi"),I=/[1-9]/,P=/\b(?:half|quarter|a|an|one|two|three|four|five|six|seven|eight|nine|ten)\s+(?:(?:of\s+)?an?\s+)?(?:milliseconds?|seconds?|minutes?|hours?|days?|weeks?|months?|years?)\b/i;function v(e){if(P.test(e))return!0;for(let t of e.matchAll(N))for(let s of t[0].matchAll(C))if(I.test(s[1]??""))return!0;return!1}var y=/^ {0,3}##[ \t]+([^\r\n]+?)[ \t]*$/gm,M=new RegExp(y.source),L=/^ {0,3}(`{3,}|~{3,})(.*)$/,U=/^ {0,3}(`+|~+)[ \t]*$/;function B(e,t){let o=t.split(/\r?\n/).map((n)=>n.trim()).filter(Boolean).map((n)=>n.replace(/^(?:[-*+]\s+|\d+[.)]\s+)/,"").trim());if(e==="Dependencies"&&o.length===1&&/^none[.!]?$/i.test(o[0]))return;if(e==="Dependencies"&&/\bnone\b/i.test(t))return"None";for(let n of o){if(/^none[.!]?$/i.test(n))return n;let r=n.match(x)?.[0];if(r)return r}return}function V(e){let t=[],s,o=0;while(o<=e.length){let n=e.indexOf(`
`,o),r=n<0?e.length:n,c=e.slice(o,r),l=c.endsWith("\r")?c.slice(0,-1):c;if(s){let a=U.exec(l);if(a&&a[1][0]===s.marker&&a[1].length>=s.length)s=void 0}else{let a=L.exec(l);if(a&&(a[1][0]!=="`"||!a[2].includes("`")))s={marker:a[1][0],length:a[1].length};else{let p=M.exec(l);if(p){let d=(p[1]??"").trim().replace(/\s+/g," ").toLowerCase(),_=A.get(d);if(_)t.push({section:_,start:o,bodyStart:n<0?e.length:n+1})}}}if(n<0)break;o=n+1}let i=new Map;for(let n of E)i.set(n,[]);for(let[n,r]of t.entries()){let c=t[n+1]?.start??e.length;i.get(r.section)?.push(e.slice(r.bodyStart,c).trim())}return i}function W(e,t){if(t.length===0)return["Missing ## "+e];let s=[];if(t.length>1)s.push("Duplicate ## "+e);for(let o of t){if(!o){s.push("Empty ## "+e);continue}let i=B(e,o);if(i!==void 0){let n=e==="Dependencies"&&/^none[.!]?$/i.test(i)?"## Dependencies may contain None only as the sole content":"## "+e+" contains placeholder content: "+JSON.stringify(i);s.push(n)}}if(e==="Checkpoint"&&t.some((o)=>o.length>0&&!v(o)))s.push("## Checkpoint must include a positive elapsed duration after spawn");return s}function K(e){let t=V(e);return E.flatMap((s)=>W(s,t.get(s)??[]))}function R(e){let t=new Set,s=!1;e.on("context",async(o)=>{if(!Array.isArray(o.messages))return;let i=o.messages.find((n)=>n&&n.role==="custom"&&n.customType==="vibe-mode-context");if(!i)return;return i.content=h,{messages:o.messages}}),e.on("tool_call",async(o)=>{if(o.toolName==="read"){let i=o.input?.path;if(typeof i==="string"&&i.length>0){let n=b(i);t.add(n),t.add(m(n))}return}if(o.toolName==="todo"){let i=o.input?.op;if(i==="init"||i==="start")s=!0;return}if(o.toolName==="vibe_spawn"){let i=o.input&&typeof o.input==="object"?o.input:{},n=typeof i.cli==="string"?i.cli:"good",r=typeof i.prompt==="string"?i.prompt:"",c=typeof i.name==="string"?i.name:"",l=K(r);if(l.length>0)return{block:!0,reason:"SLOP_GUARD_BLOCKED: Worker brief contract is incomplete. Fix: "+l.join("; ")+". Complete all six sections with concrete content; do not use placeholders."};if(f(n,c,r))return;if(t.size===0)return{block:!0,reason:"SLOP_GUARD_BLOCKED: Director has not read or verified any repository files! You MUST complete Phase 1 (recon scout via 'fast' worker) and Phase 2 (personally inspect files via 'read' to verify architecture and eliminate hallucinations) before spawning an implementation worker. Hint: If this was intended as a recon scout, name it 'recon-<topic>' or set prompt: 'RECON: ...'."};if(!g.test(r))return{block:!0,reason:"SLOP_GUARD_BLOCKED: Implementation brief lacks concrete file paths! Do not delegate vague tasks. Specify exact implementation paths under ## Scope / Non-goals, verified on disk. Hint: If this was intended as a recon scout, name it 'recon-<topic>'."};if(!D(r).some((d)=>t.has(d)||t.has(m(d))))return{block:!0,reason:"SLOP_GUARD_BLOCKED: None of the target files cited in the brief were inspected by the Director! You cited target files, but have not read them. Inspect the target files via 'read' before delegating implementation."};if(!s)return{block:!0,reason:"SLOP_GUARD_BLOCKED: Master-TODO checklist has not been initialized! You MUST complete Phase 3 by calling todo(op='init', list=[...]) to digest verified facts before spawning implementation workers."}}})}function b(e){let t=e.trim();return t=t.replace(/:[\d,\+\-]+$/,""),t=t.replace(/:(raw|img|conflicts)$/i,""),t=t.replace(/\\/g,"/"),t=t.replace(/^\.\/+/,""),t.toLowerCase()}function m(e){let t=e.lastIndexOf("/");return t===-1?e:e.slice(t+1)}function D(e){return(e.match(new RegExp(g.source,"gi"))??[]).map((s)=>b(s))}function F(e){R(e)}export{F as default};
