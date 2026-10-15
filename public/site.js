/* Lindani Farm: shared page behaviour (nav, enquiry form, scroll effects).
   Every block checks its elements exist, so the same file runs on every page. */
(function(){
  var $=function(id){return document.getElementById(id);};
  var nav=$('nav'), btn=$('menu-btn'), links=$('nav-links');

  /* ---------- menu ---------- */
  if(nav&&btn&&links){
    var setMenu=function(open){links.classList.toggle('open',open);btn.setAttribute('aria-expanded',open);};
    btn.addEventListener('click',function(){setMenu(!links.classList.contains('open'));});
    links.addEventListener('click',function(e){if(e.target.closest('a'))setMenu(false);});
    document.addEventListener('keydown',function(e){if(e.key==='Escape'&&links.classList.contains('open')){setMenu(false);btn.focus();}});
    document.addEventListener('click',function(e){if(links.classList.contains('open')&&!nav.contains(e.target))setMenu(false);});
  }
  if($('yr'))$('yr').textContent=new Date().getFullYear();

  /* ---------- current page in the nav and footer ---------- */
  var here=(location.pathname.split('/').pop()||'index.html').replace(/\.html$/,'')||'index';
  [].forEach.call(document.querySelectorAll('#nav-links a, .f-links a'),function(a){
    var h=(a.getAttribute('href')||'').split('#')[0].replace(/\.html$/,'')||'';
    if(h&&(h===here||(h==='index'&&here==='index')))a.setAttribute('aria-current','page');
  });

  /* ---------- enquiry form (homepage and contact page) ---------- */
  var eform=$('eform');
  if(eform){
    var today=new Date(Date.now()-new Date().getTimezoneOffset()*60000).toISOString().slice(0,10);
    var eIn=$('e-in'),eOut=$('e-out');
    eIn.min=today;eOut.min=today;
    var nextDay=function(v){var d=new Date(v+'T12:00:00');d.setDate(d.getDate()+1);return d.toISOString().slice(0,10);};
    eIn.addEventListener('change',function(){if(eIn.value){eOut.min=nextDay(eIn.value);if(eOut.value&&eOut.value<=eIn.value)eOut.value='';}});

    // Field errors sit under the field and are linked with aria-describedby
    var MSG={name:'Add your name.',arrival:'Choose an arrival date.',departure:'Choose a departure date.',contact:'Add a phone number or email so we can reply.'};
    var setErr=function(el,msg){
      var id=el.id+'-err',box=$(id);
      if(msg){
        if(!box){box=document.createElement('p');box.className='err';box.id=id;el.parentNode.appendChild(box);}
        box.textContent=msg;el.setAttribute('aria-invalid','true');el.setAttribute('aria-describedby',id);
      }else{
        if(box)box.remove();el.removeAttribute('aria-invalid');el.removeAttribute('aria-describedby');
      }
    };
    var fieldMsg=function(el){
      if(el.required&&!el.value.trim())return MSG[el.name]||'This field is required.';
      if(el.name==='contact'){var v=el.value.trim();if(!/@.+\./.test(v)&&v.replace(/\D/g,'').length<9)return 'Enter a valid phone number or email address.';}
      if(el===eOut&&eIn.value&&el.value&&el.value<=eIn.value)return 'Departure must be at least one night after arrival.';
      return '';
    };
    var check=function(form){
      var first=null,n=0;
      form.querySelectorAll('[required]').forEach(function(el){var m=fieldMsg(el);setErr(el,m);if(m){n++;if(!first)first=el;}});
      return {first:first,n:n};
    };
    // Validate on blur once a field has been touched, clear as soon as it's fixed
    eform.querySelectorAll('[required]').forEach(function(el){
      el.addEventListener('blur',function(){if(el.value.trim()||el.hasAttribute('aria-invalid'))setErr(el,fieldMsg(el));});
      el.addEventListener('input',function(){if(el.hasAttribute('aria-invalid')&&!fieldMsg(el))setErr(el,'');});
    });
    var enote=$('enote');
    eform.addEventListener('submit',function(e){
      e.preventDefault();
      var r=check(this);
      if(r.first){enote.dataset.state='err';enote.textContent=r.n===1?'One field needs attention.':r.n+' fields need attention.';r.first.focus();return;}
      enote.dataset.state='ok';enote.textContent='Almost done: choose how to send it below.';
      var f=this.elements;
      document.dispatchEvent(new CustomEvent('lindani:enquiry',{detail:{name:f['name'].value.trim(),contact:f['contact'].value.trim(),from:f['arrival'].value,to:f['departure'].value,adults:+f['adults'].value,kids:+f['kids'].value,message:f['message'].value.trim()}}));
    });
  }

  /* ---------- in-page anchors: highlight the section being read ---------- */
  if(links&&'IntersectionObserver' in window){
    var navLinks=[].slice.call(links.querySelectorAll('a[href^="#"]'));
    var secs=navLinks.map(function(a){return document.querySelector(a.getAttribute('href'));});
    var spy=new IntersectionObserver(function(es){
      es.forEach(function(en){if(en.isIntersecting){var i=secs.indexOf(en.target);navLinks.forEach(function(a,k){if(k===i)a.setAttribute('aria-current','true');else a.removeAttribute('aria-current');});}});
    },{rootMargin:'-45% 0px -50% 0px'});
    secs.forEach(function(s){if(s)spy.observe(s);});
  }

  /* ---------- nearby list highlight + stacked cards ---------- */
  var places=[].slice.call(document.querySelectorAll('#places li'));
  places.forEach(function(li){li.addEventListener('mouseenter',function(){places.forEach(function(x){x.classList.toggle('on',x===li);});});});
  var reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
  var cards=[].slice.call(document.querySelectorAll('.stack .card'));
  function frame(){
    // Read everything first, then write, so the browser lays out once per frame
    var mid=innerHeight*0.5,best=null,bd=1e9;
    places.map(function(li){return li.getBoundingClientRect();}).forEach(function(r,i){var d=Math.abs(r.top+r.height/2-mid);if(d<bd){bd=d;best=places[i];}});
    var anim=!reduce&&cards.length>1;
    var tops=anim?cards.map(function(c){return c.getBoundingClientRect().top;}):[];
    var hs=anim?cards.map(function(c){return c.offsetHeight;}):[];
    var stick=anim?parseFloat(getComputedStyle(cards[0]).top):0;
    if(nav)nav.classList.toggle('scrolled',scrollY>20);
    places.forEach(function(li){li.classList.toggle('on',li===best);});
    if(!anim)return;
    cards.forEach(function(c,i){
      if(i===cards.length-1){c.style.transform='';return;}
      var p=Math.max(0,Math.min(1,1-(tops[i+1]-stick)/(hs[i]+48)));
      c.style.transform=p?'scale('+(1-0.05*p)+') rotate('+((i%2?1:-1)*2.2*p)+'deg)':'';
    });
  }
  var ticking=false;
  function req(){if(!ticking){ticking=true;requestAnimationFrame(function(){frame();ticking=false;});}}
  addEventListener('scroll',req,{passive:true});
  addEventListener('resize',req);
  frame();
})();
