<template>
  <div>
    
    <div style="height: 18em; display: flex;" v-if="viz">

      <div style="height: 100%; overflow-x: hidden; overflow-y: auto; flex: 0 0 17em;">
        <router-link :to="{ name: 'view', params: { id: viz._id } }">
          <img :src="img" style="object-fit: cover; height: 10em; width: 16em;"/>
          <br/>
          <small>{{ viz._id }}</small>
          <br/>
        </router-link>

        <b>{{ viz.name }}</b>
        <br/>

        <i>{{ viz.author.username }}</i>
        <br/>
        
        <i :class="`fas fa-${viz.visibility === 'public' ? 'eye' : 'eye-slash'}`"></i>
        <span>{{ viz.visibility }}</span>
        <br/>
        
        <i :class="`fas fa-${viz.paymentEnabled ? 'coins' : 'star-of-life'}`"></i>
        <span>{{ viz.paymentEnabled ? 'paid' : 'free' }}</span>
      </div>

      <div style="height: 100%; overflow-x: hidden; overflow-y: auto;">
        {{ viz.short_description }}
      </div>

    </div>

  </div>
</template>

<script>
import GeoPattern from 'geopattern';

export default {
  name: 'VizCard',
  props: ['visualization'],
  data() {
    return {
      viz: null,
      img: null
    }
  },
  methods: {
    updateImg() {
      let pattern = GeoPattern.generate(this.viz._id);
      this.img = pattern.toDataUri();
    }
  },
  async mounted() {

    if (this.visualization) {
      this.viz = this.visualization;
      this.updateImg();
      return;
    }

    while(this.$auth.loading) {
      await this.wait(100);
    }

  },
  watch: { 
    visualization: function(newVal) {
      this.viz = newVal
      this.updateImg();
    }
  }
  
}
</script>

<style scoped>
</style>