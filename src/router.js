import { createRouter, createWebHashHistory } from 'vue-router'
import TreeView from '@/views/TreeView.vue'
import ProfileView from '@/views/ProfileView.vue'
import AdminView from '@/views/AdminView.vue'
import PersonEditor from '@/views/PersonEditor.vue'
import PhotoLibrary from '@/views/PhotoLibrary.vue'

export default createRouter({
  // Hash history so the app works on any static host without server rewrites.
  history: createWebHashHistory(),
  routes: [
    { path: '/', name: 'tree', component: TreeView },
    { path: '/person/:id', name: 'person', component: ProfileView, props: true },
    { path: '/admin', name: 'admin', component: AdminView },
    { path: '/admin/photos', name: 'admin-photos', component: PhotoLibrary },
    { path: '/admin/new', name: 'admin-new', component: PersonEditor },
    { path: '/admin/edit/:id', name: 'admin-edit', component: PersonEditor, props: true },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
  scrollBehavior: () => ({ top: 0 }),
})
