/** Once the page moves, the nav fills the lacquer band. */
const html = document.documentElement
let barStuck = false

function applyBar() {
  const next = window.scrollY > 4
  if (next === barStuck) return
  barStuck = next
  html.toggleAttribute('data-stuck', next)
}

applyBar()
window.addEventListener('scroll', applyBar, { passive: true })
