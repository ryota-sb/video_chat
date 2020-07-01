import Vue from 'vue'
import VueRouter from 'vue-router'
import Home from '../views/Home.vue'
import Room from '../views/Room.vue'
import SignIn from '@/components/SignIn.vue'
import store from '@/store/index.js'

import { AmplifyEventBus } from 'aws-amplify-vue'
import { AmplifyPlugin } from 'aws-amplify-vue'
import * as AmplifyModules from 'aws-amplify'

Vue.use(VueRouter)
Vue.use(AmplifyPlugin, AmplifyModules)

let user

getUser().then(user => {
  if(user) {
    router.push({ path: '/' })
  }
})

function getUser() {
  return Vue.prototype.$Amplify.Auth.currentAuthenticatedUser().then(data => {
    if(data && data.signInUserSession) {
      store.commit('setUser', data)
      return data
    }
  }).catch(() => {
    store.commit('setUser', null)
    return null
  })
}

AmplifyEventBus.$on('authState', async(state) => {
  if (state === 'signedOut') {
    user = null
    store.commit('setUser', null)
    router.push({ path: '/signin' })
  } else if (state === 'signedIn') { 
    user = await getUser()
    router.push({ path: '/' })
  }
})

const routes = [
  { path: '/',       name: 'Home',   component: Home },
  { path: '/signin', name: 'signin', component: SignIn },
  { path: '/room',   name: 'Room',   component: Room, meta: { requireAuth: true } }
]

const router = new VueRouter({
  mode: 'history',
  base: process.env.BASE_URL,
  routes
})

router.beforeResolve(async(to, from, next) => {
  if (to.matched.some(record => record.meta.requireAuth)) {
    user = await getUser()
    if (!user) {
      return next({ path: '/signin' })
    }
    return next()
  }
  return next()
})

export default router
