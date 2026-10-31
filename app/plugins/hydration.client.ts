export default defineNuxtPlugin({
  name: 'hydration-marker',
  enforce: 'post',
  setup() {
    onNuxtReady(() => {
      document.documentElement.dataset.hydrated = 'true'
    })
  },
})
