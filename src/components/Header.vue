<template>
  <v-container>
    <v-app-bar
      app
      color="primary"
      dark
    >
      <v-app-bar-nav-icon></v-app-bar-nav-icon>
      <v-toolbar-title>Video Chat</v-toolbar-title>
      <v-spacer></v-spacer>
      <v-btn
        icon
        v-for="route in routes"
        :key="route.name"
        :to="route.link"
      >
        <v-icon>{{ route.icon }}</v-icon>
      </v-btn>
    </v-app-bar>
  </v-container>
</template>

<script>
export default {
  data() {
    return {
      routes: [
        { name: 'home',   link: '/',       icon: 'mdi-magnify'},
        { name: 'room',   link: '/room',   icon: 'mdi-heart' },
        { name: 'signin', link: '/signin', icon: 'mdi-magnify' },
      ]
    }
  }
}
</script>
