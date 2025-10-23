---
layout: post.njk
title: "New mstewarts3.fun collab with London real time and +police (call option) "
date: 2025-10-23
description: "(We will add HTML soon, need to figure out how first) "
tags:
  - cozypolice
---
M﻿any tried, but they failed. Now we prosper. Mstewarts3 brings you your own HTML where you can  listen to police and Logo bounce. It was long awaited. Police and London+mstewart have joined forces to bring you this.\
\
<!-- The main stage for the animation -->

<div class="stage" id="stage">
    <div class="clock" id="clock">
        <div class="label">London time in London - Clock</div>
        <div class="time" id="clockTime">--:--:--</div>
    </div>
    <div id="icon">MStewarts3.logo</div>
</div>

<!-- All the CSS styles needed for this animation -->

<style>
    /* The window / stage with black backdrop */
    .stage {
        width: min(90vw, 900px);
        height: min(70vh, 600px);
        background: #000;
        border-radius:8px;
        box-shadow: 0 10px 30px rgba(0,0,0,0.6), 0 2px 6px rgba(0,0,0,0.5);
        position:relative;
        overflow:hidden;
        border:1px solid rgba(255,255,255,0.04);
    }

    /* Centered clock */
    .clock {
        position: absolute;
        left: 50%;
        top: 50%;
        transform: translate(-50%,-50%);
        text-align: center;
        color: #ddd;
        background: rgba(255,255,255,0.03);
        padding: 12px 18px;
        border-radius: 8px;
        font-weight:600;
        pointer-events: none;
        user-select: none;
        box-shadow: 0 2px 10px rgba(0,0,0,0.6);
        backdrop-filter: blur(4px);
    }
    .clock .label {
        font-size: 13px;
        opacity: 0.85;
        margin-bottom: 6px;
    }
    .clock .time {
        font-size: 20px;
        letter-spacing: 0.4px;
    }

    /* Small icon */
    #icon {
        position:absolute;
        left:50%;
        top:50%;
        transform:translate(-50%,-50%);
        padding:8px 10px;
        background: rgba(255,255,255,0.06);
        color: #fff; /* initial white text */
        font-weight:600;
        font-size:14px;
        letter-spacing:0.2px;
        border-radius:6px;
        pointer-events:none;
        user-select:none;
        white-space:nowrap;
        box-shadow: 0 2px 8px rgba(0,0,0,0.6);
        transition: color 120ms linear;
        z-index: 5;
    }

    /* Police Flash styles */
    .police-flash {
        position:absolute;
        left:50%;
        bottom:60px;
        transform:translateX(-50%);
        font-weight:700;
        font-size:14px;
        padding:6px 10px;
        border-radius:6px;
        pointer-events:none;
        user-select:none;
        z-index:21;
        display:inline-flex;
        align-items:center;
        gap:8px;
        background: rgba(0,0,0,0.18);
        backdrop-filter: blur(2px);
        animation: policeFlash 0.8s infinite alternate;
    }
    .police-flash::before {
        content: "➤" !important;
        margin-right: 10px !important;
        transform: translateY(6px) rotate(10deg) !important;
    }
    .police-flash::after {
        content: "◂" !important;
        margin-left: 10px !important;
        transform: translateY(6px) rotate(-10deg) !important;
    }
    @keyframes policeFlash {
        from { color: red; }
        to   { color: blue; }
    }
</style>

<!-- All the JavaScript scripts needed for this animation -->

<script>
    // Clock showing GMT+2
    (function(){
        const timeEl = document.getElementById('clockTime');
        function pad(n){ return n.toString().padStart(2,'0'); }
        function updateClock(){
            const now = new Date();
            const utc = new Date(now.getTime() + now.getTimezoneOffset()*60000);
            const target = new Date(utc.getTime() + 2*60*60*1000);
            const hh = pad(target.getHours());
            const mm = pad(target.getMinutes());
            const ss = pad(target.getSeconds());
            timeEl.textContent = `${hh}:${mm}:${ss}`;
        }
        updateClock();
        setInterval(updateClock, 250);
    })();

    // Moving bouncing icon
    (function(){
        const stage = document.getElementById('stage');
        const icon = document.getElementById('icon');
        if (!stage || !icon) return; // Prevent errors if elements don't exist

        const SPEED = 220;
        function sizes() { return { stageW: stage.clientWidth, stageH: stage.clientHeight, iconW: icon.offsetWidth, iconH: icon.offsetHeight }; }

        const s = sizes();
        let x = (s.stageW - s.iconW) / 2;
        let y = (s.stageH - s.iconH) / 2;
        let angle = (Math.random() * 2 * Math.PI);
        if (Math.abs(Math.cos(angle)) < 0.15) angle += 0.2;
        if (Math.abs(Math.sin(angle)) < 0.15) angle += 0.2;
        let vx = Math.cos(angle) * SPEED;
        let vy = Math.sin(angle) * SPEED;

        function renderPos() {
            icon.style.left = x + 'px';
            icon.style.top = y + 'px';
            icon.style.transform = '';
        }
        renderPos();

        function randomColor() {
            const hue = Math.floor(Math.random()*360);
            const sat = 70 + Math.floor(Math.random()*30);
            const light = 50 + Math.floor(Math.random()*10);
            return `hsl(${hue} ${sat}% ${light}%)`;
        }

        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        const audioCtx = AudioCtx ? new AudioCtx() : null;
        function playBeep(freq = 880, dur = 0.12) {
            if (!audioCtx) return;
            if (audioCtx.state === 'suspended') { audioCtx.resume().catch(()=>{}); }
            const now = audioCtx.currentTime;
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = 'sine';
            osc.frequency.value = freq;
            gain.gain.setValueAtTime(0.0001, now);
            gain.gain.exponentialRampToValueAtTime(0.12, now + 0.01);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.start(now);
            osc.stop(now + dur + 0.02);
        }

        let lastTime = performance.now();
        function step(now) {
            const dt = Math.min(0.05, (now - lastTime) / 1000);
            lastTime = now;
            const dims = sizes();
            x += vx * dt;
            y += vy * dt;
            let bounced = false;
            if (x <= 0) { x = 0; vx = -vx; bounced = true; }
            if (x + dims.iconW >= dims.stageW) { x = dims.stageW - dims.iconW; vx = -vx; bounced = true; }
            if (y <= 0) { y = 0; vy = -vy; bounced = true; }
            if (y + dims.iconH >= dims.stageH) { y = dims.stageH - dims.iconH; vy = -vy; bounced = true; }

            if (bounced) {
                const col = randomColor();
                icon.style.color = col;
                const hueMatch = col.match(/^hsl\((\d+)/);
                const hue = hueMatch ? Number(hueMatch[1]) : 0;
                const freq = 600 + (hue / 360) * 500;
                playBeep(freq, 0.12);
            }
            renderPos();
            requestAnimationFrame(step);
        }

        window.addEventListener('resize', () => {
            const d = sizes();
            x = Math.max(0, Math.min(x, d.stageW - d.iconW));
            y = Math.max(0, Math.min(y, d.stageH - d.iconH));
            renderPos();
        });
        requestAnimationFrame(step);
    })();

    // Police Button and Siren
    (function(){
        const stage = document.getElementById('stage') || document.body;
        
        const flash = document.createElement('div');
        flash.className = 'police-flash';
        flash.textContent = '!! CLICK FOR POLICE NOW !!';
        stage.appendChild(flash);
        
        const btn = document.createElement('button');
        btn.id = 'policeBtn';
        btn.textContent = 'police';
        Object.assign(btn.style, {
            position: 'absolute', left: '50%', bottom: '12px', transform: 'translateX(-50%)', padding: '8px 14px',
            borderRadius: '6px', border: 'none', cursor: 'pointer', background: '#0b69ff', color: '#fff',
            fontWeight: '600', zIndex: '20', boxShadow: '0 2px 10px rgba(0,0,0,0.6)'
        });
        stage.appendChild(btn);

        let timer = null;
        let state = false;
        btn.addEventListener('click', () => {
            if (timer) {
                clearInterval(timer);
                timer = null;
                btn.style.background = '#0b69ff';
                return;
            }
            timer = setInterval(() => {
                state = !state;
                btn.style.background = state ? '#ff1e1e' : '#0b69ff';
            }, 50);
        });

        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        const audioCtx = AudioCtx ? new AudioCtx() : null;
        let sirenNodes = null, sirenInterval = null, sirenOn = false;

        function startSiren() {
            if (!audioCtx || sirenOn) return;
            if (audioCtx.state === 'suspended') audioCtx.resume().catch(()=>{});
            const gain = audioCtx.createGain();
            gain.gain.setValueAtTime(0.0001, audioCtx.currentTime);
            gain.gain.linearRampToValueAtTime(0.18, audioCtx.currentTime + 0.02);
            const osc1 = audioCtx.createOscillator();
            const osc2 = audioCtx.createOscillator();
            osc1.type = 'sawtooth'; osc2.type = 'sawtooth';
            osc1.frequency.value = 800; osc2.frequency.value = 1200;
            osc2.detune.value = -20;
            const merger = audioCtx.createGain();
            osc1.connect(merger); osc2.connect(merger);
            merger.connect(gain); gain.connect(audioCtx.destination);
            osc1.start(); osc2.start();
            let up = true;
            sirenInterval = setInterval(() => {
                const now = audioCtx.currentTime;
                osc1.frequency.cancelScheduledValues(now);
                osc2.frequency.cancelScheduledValues(now);
                if (up) {
                    osc1.frequency.linearRampToValueAtTime(1200, now + 0.5);
                    osc2.frequency.linearRampToValueAtTime(1600, now + 0.5);
                } else {
                    osc1.frequency.linearRampToValueAtTime(800, now + 0.5);
                    osc2.frequency.linearRampToValueAtTime(1200, now + 0.5);
                }
                up = !up;
            }, 500);
            sirenNodes = { osc1, osc2, gain, merger };
            sirenOn = true;
        }

        function stopSiren() {
            if (!audioCtx || !sirenOn) return;
            clearInterval(sirenInterval);
            sirenInterval = null;
            const { osc1, osc2, gain } = sirenNodes;
            const now = audioCtx.currentTime;
            gain.gain.cancelScheduledValues(now);
            gain.gain.setValueAtTime(gain.gain.value, now);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.06);
            setTimeout(() => {
                try { osc1.stop(); osc2.stop(); osc1.disconnect(); osc2.disconnect(); gain.disconnect(); } catch (e) {}
            }, 120);
            sirenNodes = null;
            sirenOn = false;
        }

        document.addEventListener('click', (e) => {
            if (e.target && e.target.id === 'policeBtn') {
                if (sirenOn) stopSiren(); else startSiren();
            }
        });
    })();
</script>