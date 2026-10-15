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

  /* ---------- message form (Contact page) ---------- */
  var eform=$('eform');
  if(eform){
    
    // Field errors sit under the field and are linked with aria-describedby
    var MSG={name:'Add your name.',contact:'Add a phone number or email so we can reply.',message:'Add your message.'};
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
      document.dispatchEvent(new CustomEvent('lindani:enquiry',{detail:{name:f['name'].value.trim(),contact:f['contact'].value.trim(),message:f['message'].value.trim()}}));
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

  /* ---------- nearby list highlight (the stacked cards tilt with CSS scroll-driven animations) ---------- */
  var places=[].slice.call(document.querySelectorAll('#places li'));
  places.forEach(function(li){li.addEventListener('mouseenter',function(){places.forEach(function(x){x.classList.toggle('on',x===li);});});});
  function frame(){
    // Read everything first, then write, so the browser lays out once per frame
    var mid=innerHeight*0.5,best=null,bd=1e9;
    places.map(function(li){return li.getBoundingClientRect();}).forEach(function(r,i){var d=Math.abs(r.top+r.height/2-mid);if(d<bd){bd=d;best=places[i];}});
    if(nav)nav.classList.toggle('scrolled',scrollY>20);
    places.forEach(function(li){li.classList.toggle('on',li===best);});

  }
  var ticking=false;
  function req(){if(!ticking){ticking=true;requestAnimationFrame(function(){frame();ticking=false;});}}
  addEventListener('scroll',req,{passive:true});
  addEventListener('resize',req);
  frame();
})();
