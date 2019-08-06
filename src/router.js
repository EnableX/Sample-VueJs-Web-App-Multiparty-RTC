import Vue from 'vue'
import Router from 'vue-router'
import Login from './views/Login.vue'
import Room from './views/Room.vue'

Vue.use(Router)

export default new Router({
  mode: 'history',
  base: process.env.BASE_URL,
  routes: [
    {
      path: '/',
      name: 'login',
      component: Login
    },
    {
      path: '/confo/:roomId/:userType/:userRef',
      name: 'room',
      component: Room
    }
  ]
})
