<template>
  <div id="wrapper">
    <div
      id="container"
      @mousedown="onMouseDown"
      @mouseup="onMouseUp"
    ></div>
  </div>
</template>

<script>
import { mapState } from 'vuex';

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { VRButton } from 'three/examples/jsm/webxr/VRButton.js';

window.THREE = THREE;

let container, renderer, scene, camera, controls, composer;


let audioContext;
let analyser;
let gainNode;
let audioIsLoaded = false;



let ARR_SIZE = 16;
let array = new Uint8Array(ARR_SIZE * ARR_SIZE);
let lowFreqArray = new Uint8Array(ARR_SIZE * ARR_SIZE);
let midFreqArray = new Uint8Array(ARR_SIZE * ARR_SIZE);
let higFreqArray = new Uint8Array(ARR_SIZE * ARR_SIZE);
let FREQOBJ = {};
FREQOBJ['allFreqArray'] = array;
FREQOBJ['lowFreqArray'] = lowFreqArray;
FREQOBJ['midFreqArray'] = midFreqArray;
FREQOBJ['higFreqArray'] = higFreqArray;
let firstBrk = 86;
let secondBrk = 170;
let lowIdx, midIdx, higIdx;


let vizObjInstance;
let sceneContent;
let vrButton;


export default {
  name: 'Three',
  data() {
    return { }
  },
  computed: mapState(['audioSource']),
  watch: {
    audioSource (newSrc, oldSrc) {
      this.onAudioSourceUpdate();
    }
  },
  methods: {
    async toggleMute() {
      this.$store.commit('updateMuteStatus', !this.$store.state.isMuted);
      gainNode.gain.setValueAtTime(this.$store.state.isMuted ? 0 : 1, audioContext.currentTime);
    },
    async onAudioSourceUpdate() {
      if (audioIsLoaded) {
        audioContext.close();
      }
      await this.wait(2000);
      audioContext = new AudioContext();
      let src = this.audioSource;
      console.log(`Received new source...`);
      console.log(JSON.stringify(src, null, 2));
      let sourceIsStream = !!src.stream;
      let audioSouceNode;
      if (sourceIsStream) {
        await this.wait(2000);
        audioSouceNode = audioContext.createMediaStreamSource(src.stream);
      } else {
        let resp = await this.$api.get(src.source, { responseType: 'arraybuffer' });
        let audio = resp.data;
        let buffer = await audioContext.decodeAudioData(audio);
        audioSouceNode = audioContext.createBufferSource();
        audioSouceNode.buffer = buffer;
      }
      gainNode = audioContext.createGain();
      gainNode.gain.setValueAtTime(this.$store.state.isMuted ? 0 : 1, audioContext.currentTime);
      audioSouceNode.connect(gainNode);
      analyser = audioContext.createAnalyser();
      analyser.fftSize = 512;
      audioSouceNode.connect(analyser);
      analyser.connect(gainNode);
      gainNode.connect(audioContext.destination);
      if (!sourceIsStream) {
        audioSouceNode.start(0);
      }
      if(this.$store.state.isPlaying || sourceIsStream) {
        audioContext.resume();
        // this.$store.commit('updatePlayStatus', true);
      } else {
        audioContext.suspend();
      }
      audioIsLoaded = true;
    },
    async onPlayClicked() {
      if (!audioIsLoaded) return;
      if(this.$store.state.isPlaying) {
        audioContext.suspend();
        this.$store.commit('updatePlayStatus', false);
      } else {
        audioContext.resume();
        this.$store.commit('updatePlayStatus', true);
      }
    },
    onContainerResize() {
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    },
    async initViz() {
      if (this.$store.state.isPlaying) return;

      if(sceneContent) {
        scene.remove(sceneContent);
      }

      eval.apply(window, [this.$store.state.code]);

      let vizObjRefs = window.getRefs();
      for(let j = 0; j < vizObjRefs.length; j++) {
        let vizObjRefResource = await this.$api.get(vizObjRefs[j]);
        let vizObjRefText = vizObjRefResource.data;
        eval.apply(window, [vizObjRefText]);
      }

      let vizObjClass = window.getObj();
      vizObjInstance = new vizObjClass();
      sceneContent = await vizObjInstance.init();

      scene.add(sceneContent);
    },
    updateViz() {
      // if (!this.$store.state.isPlaying) return;
      if (!analyser) return;
      
      lowIdx = 0;
      midIdx = 0;
      higIdx = 0;
      analyser.getByteFrequencyData(array);
      for(let p=0; p<array.length; p++) {
        if (array[p] < firstBrk) { lowFreqArray[lowIdx] = array[p]; lowIdx++; }
        else if (array[p] > secondBrk) { higFreqArray[higIdx] = array[p]; higIdx++; }
        else { midFreqArray[midIdx] = array[p]; midIdx++; }
      }
      vizObjInstance.renderFrame(FREQOBJ);
    },
    init: function() {
      container = document.getElementById('container');

      camera = new THREE.PerspectiveCamera(60, container.clientWidth/container.clientHeight, 10, 10000000);
      camera.position.set(300, 800, 600);
      camera.lookAt(new THREE.Vector3());

      scene = new THREE.Scene();
      scene.add(camera);

      renderer = new THREE.WebGLRenderer({antialias: true});
      renderer.xr.enabled = true;
      renderer.setSize(container.clientWidth, container.clientHeight);
      container.appendChild(renderer.domElement);

      composer = new EffectComposer(renderer);
      composer.addPass(new RenderPass(scene, camera));
      composer.addPass(new UnrealBloomPass());

      controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor  = 0.2;
      controls.update();

      // controls.addEventListener('change', async () => {
      //   console.log('foo');
      // });
      
      window.addEventListener('resize', () => {
        this.onContainerResize();
      }, false);
      this.onContainerResize();

    },
    animate: function() {
      renderer.setAnimationLoop(() => {
        this.updateViz();
        controls.update();
        composer.render();
        // renderer.render(scene, camera);
      });
    },
    onMouseDown: function() {
    },
    onMouseUp: function() {
    }
  },
  mounted() {
    this.init();
    this.animate();
    vrButton = VRButton.createButton(renderer);
    document.body.appendChild(vrButton);
  },
  async beforeDestroy() {
    vrButton.remove();
  }
}
</script>

<style scoped>
#container {
  width: 100%;
  height: 100%;
  padding: 0px;
  margin: 0px;
  overflow: hidden;
}

#wrapper {
  width: 100%;
  height: 100%;
  margin: 0px;
  padding: 0px;
  overflow: hidden;
}
</style>