<template>
  <div id="app">
    <Welcome />
  </div>
</template>

<script>
import Welcome from './components/Welcome.vue';

export default {
  name: "App",
  components: {
    Welcome,
  },
};
</script>

<style>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
}
</style>
