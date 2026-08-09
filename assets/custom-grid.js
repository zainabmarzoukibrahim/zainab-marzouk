(function() {
  'use strict';

  const AUTO_ADD_HANDLE = 'soft-winter-jacket';
  const AUTO_ADD_OPTIONS = ['black', 'medium'];

  let currentProduct = null;
  let currentVariant = null;

  
  function preparePopup() {
  
    if (document.querySelector('.product-popup')) return;

    const popupClose = document.querySelector('.popup-close');
    const popupContent = document.querySelector('.product-popup-content');

    if (!popupContent) {
      console.error('Popup content not found!');
      return;
    }

   
    const wrapper = document.createElement('div');
    wrapper.className = 'product-popup';

    
    const overlay = document.createElement('div');
    overlay.className = 'popup-overlay';

    
    const imgWrapper = popupContent.querySelector('.popup-image-wrapper');
    if (imgWrapper && !imgWrapper.querySelector('img')) {
      const img = document.createElement('img');
      img.id = 'popupImg';
      img.className = 'popup-img';
      img.alt = '';
      imgWrapper.appendChild(img);
    }

    
    if (popupClose && popupClose.parentNode) {
      popupClose.parentNode.removeChild(popupClose);
    }
    if (popupContent && popupContent.parentNode) {
      popupContent.parentNode.removeChild(popupContent);
    }

    
    wrapper.appendChild(overlay);
    wrapper.appendChild(popupClose);
    wrapper.appendChild(popupContent);

    
    document.body.appendChild(wrapper);
  }

 
  function formatPrice(cents) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: Shopify.currency.active || 'USD'
    }).format(cents / 100);
  }

  function getSelectedVariant() {
  if (!currentProduct) return null;
  if (currentProduct.variants.length === 1) return currentProduct.variants[0];

  const variantsBox = document.getElementById('popupVariants');
  if (!variantsBox) return null;

  const selected = [];

  currentProduct.options.forEach(option => {
    if (option.name.toLowerCase() === 'color') {
      const activeColor = variantsBox.querySelector('.color-btn.is-active');
      selected.push(activeColor ? activeColor.dataset.value : '');
    } else {
      const select = variantsBox.querySelector('.popup-variant-select');
      selected.push(select ? select.value : '');
    }
  });

  return currentProduct.variants.find(v => {
    return v.options.every((opt, i) => opt === selected[i]);
  });
}

  function shouldAutoAdd(variant) {
    if (!variant || !variant.options) return false;
    const opts = variant.options.map(o => o.toLowerCase());
    return AUTO_ADD_OPTIONS.every(o => opts.includes(o));
  }


  function openPopup(handle) {
    preparePopup();

    currentProduct = null;
    currentVariant = null;

    const popup = document.querySelector('.product-popup');
    const errorMsg = document.getElementById('popupError');
    const addBtn = document.getElementById('popupAddBtn');

    if (!popup) {
      console.error('Popup wrapper not found!');
      return;
    }

    if (errorMsg) {
      errorMsg.style.display = 'none';
      errorMsg.classList.remove('is-visible');
    }

    if (addBtn) {
      addBtn.disabled = true;
      addBtn.style.opacity = '0.5';
      addBtn.innerHTML = '<span>ADD TO CART</span><span class="popup-arrow">→</span>';
      addBtn.classList.remove('is-loading');
    }

    popup.classList.add('is-open');
    document.body.classList.add('popup-open');

    fetch(`/products/${handle}.js`)
      .then(r => {
        if (!r.ok) throw new Error('Product not found');
        return r.json();
      })
      .then(product => {
        currentProduct = product;
        renderPopup(product);
      })
      .catch(err => {
        console.error('Error:', err);
        if (errorMsg) {
          errorMsg.textContent = 'Failed to load product.';
          errorMsg.style.display = 'block';
          errorMsg.classList.add('is-visible');
        }
      });
  }

  function closePopup() {
    const popup = document.querySelector('.product-popup');
    if (popup) {
      popup.classList.remove('is-open');
      document.body.classList.remove('popup-open');
    }
  }


  function renderPopup(product) {
    const popupImg = document.getElementById('popupImg');
    const popupTitle = document.getElementById('popupTitle');
    const popupPrice = document.getElementById('popupPrice');
    const popupDesc = document.getElementById('popupDesc');
    const variantsBox = document.getElementById('popupVariants');
    const addBtn = document.getElementById('popupAddBtn');

    if (popupImg) {
      popupImg.src = product.featured_image;
      popupImg.alt = product.title;
    }
    if (popupTitle) popupTitle.textContent = product.title;
    if (popupPrice) popupPrice.textContent = formatPrice(product.price);
    if (popupDesc) popupDesc.innerHTML = product.description || '';

    if (variantsBox) variantsBox.innerHTML = '';

    if (product.options && product.options.length > 1 && variantsBox) {
      product.options.forEach(option => {
        const wrapper = document.createElement('div');
        wrapper.className = 'popup-variant-group';

        const label = document.createElement('label');
        label.className = 'popup-variant-label';
        label.textContent = option.name;
        wrapper.appendChild(label);

        if (option.name.toLowerCase() === 'color') {
          const btnsWrap = document.createElement('div');
          btnsWrap.className = 'color-buttons';

          option.values.forEach((val, idx) => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'color-btn' + (idx === 0 ? ' is-active' : '');
            btn.dataset.value = val;
            btn.textContent = val;

            btn.addEventListener('click', function() {
              btnsWrap.querySelectorAll('.color-btn').forEach(b => b.classList.remove('is-active'));
              this.classList.add('is-active');
              updateVariant();
            });

            btnsWrap.appendChild(btn);
          });

          wrapper.appendChild(btnsWrap);
        } else {
          const select = document.createElement('costum');
          select.className = 'popup-variant-select';

          option.values.forEach(val => {
            const opt = document.createElement('option');
            opt.value = val;
            opt.textContent = val;
            select.appendChild(opt);
          });

          select.addEventListener('change', updateVariant);
          wrapper.appendChild(select);
        }

        variantsBox.appendChild(wrapper);
      });
    }

    updateVariant();
  }

  function updateVariant() {
    const addBtn = document.getElementById('popupAddBtn');
    const popupPrice = document.getElementById('popupPrice');

    currentVariant = getSelectedVariant();

    if (currentVariant) {
      if (popupPrice) popupPrice.textContent = formatPrice(currentVariant.price);
      if (addBtn) {
        addBtn.disabled = false;
        addBtn.style.opacity = '1';
      }
    } else {
      if (addBtn) {
        addBtn.disabled = true;
        addBtn.style.opacity = '0.5';
      }
    }
  }

 
  function addToCart() {
    if (!currentVariant) return;

    const addBtn = document.getElementById('popupAddBtn');
    const errorMsg = document.getElementById('popupError');

    if (addBtn) {
      addBtn.classList.add('is-loading');
      addBtn.innerHTML = '<span>ADDING...</span>';
    }
    if (errorMsg) {
      errorMsg.style.display = 'none';
      errorMsg.classList.remove('is-visible');
    }

    const items = [{ id: currentVariant.id, quantity: 1 }];
    const autoAdd = shouldAutoAdd(currentVariant);

    fetch('/cart/add.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items })
    })
    .then(r => {
      if (!r.ok) throw new Error('Add failed');
      return r.json();
    })
    .then(() => {
      if (autoAdd) return addAutoProduct();
    })
    .then(() => {
      if (addBtn) {
        addBtn.innerHTML = '<span>ADDED!</span>';
        addBtn.classList.remove('is-loading');
      }
      setTimeout(closePopup, 1500);
    })
    .catch(err => {
      console.error(err);
      if (errorMsg) {
        errorMsg.textContent = 'Failed to add to cart.';
        errorMsg.style.display = 'block';
        errorMsg.classList.add('is-visible');
      }
      if (addBtn) {
        addBtn.innerHTML = '<span>ADD TO CART</span><span class="popup-arrow">→</span>';
        addBtn.classList.remove('is-loading');
      }
    });
  }

  function addAutoProduct() {
    return fetch(`/products/${AUTO_ADD_HANDLE}.js`)
      .then(r => r.ok ? r.json() : null)
      .then(product => {
        if (!product || !product.variants[0]) return;
        return fetch('/cart/add.js', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            items: [{ id: product.variants[0].id, quantity: 1 }]
          })
        });
      })
      .catch(err => console.warn('Auto-add failed:', err));
  }

 
  function init() {
    preparePopup();

   
    document.querySelectorAll('.grid-popup-btn').forEach(btn => {
      btn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        const handle = this.dataset.productHandle;
        if (handle) openPopup(handle);
      });
    });

  
    document.addEventListener('click', function(e) {
      if (e.target.classList.contains('popup-close') || e.target.classList.contains('popup-overlay')) {
        closePopup();
      }
    });

    document.addEventListener('click', function(e) {
      if (e.target.closest('#popupAddBtn')) {
        addToCart();
      }
    });

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') closePopup();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
