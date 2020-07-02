<template>
  <v-container>
    <v-app-bar
      app
      color="green darken-4"
      dark
    >
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
        { name: 'home',   link: '/',       icon: 'mdi-home'},
        { name: 'room',   link: '/room',   icon: 'mdi-message-video' },
        { name: 'signin', link: '/signin', icon: 'mdi-login' },
      ]
    }
  }
}
</script>
