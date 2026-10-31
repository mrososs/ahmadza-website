<template>
  <div class="min-h-screen bg-paper text-ink">
    <a class="skip-link" href="#main-content">انتقل إلى المحتوى</a>
    <AppHeader />
    <main id="main-content">
      <slot />
    </main>
    <AppFooter />
  </div>
</template>
