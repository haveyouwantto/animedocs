document$.subscribe(() => { 
  for (const el of document.querySelectorAll('.photo-wall')) {
    const config = JSON.parse(el.textContent);
    el.textContent = '';
    const wall = new PhotoWall(el, config);
  }

})