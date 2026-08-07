/**
 * Gift Guide Grid
 * Popup + Variants + Add to Cart
 */

(function () {
  'use strict';

  const AUTO_ADD_HANDLE = 'soft-winter-jacket';
  const AUTO_ADD_OPTIONS = ['black', 'medium'];

  let popup;
  let overlay;
  let closeBtn;
  let addBtn;
  let errorMsg;

  let popupImg;
  let popupTitle;
  let popupPrice;
  let popupDesc;
  let popupVariants;

  let currentProduct = null;
  let currentVariant = null;

  /*
   * ============================
   * INIT
   * ============================
   */

  function init() {
    popup = document.getElementById('productPopup');

    if (!popup) {
      console.warn('Product popup not found.');
      return;
    }

    overlay = popup.querySelector('.popup-overlay');
    closeBtn = popup.querySelector('.popup-close');

    addBtn = document.getElementById('popupAddBtn');
    errorMsg = document.getElementById('popupError');

    popupImg = document.getElementById('popupImg');
    popupTitle = document.getElementById('popupTitle');
    popupPrice = document.getElementById('popupPrice');
    popupDesc = document.getElementById('popupDesc');
    popupVariants = document.getElementById('popupVariants');

    initGridButtons();
    initPopupControls();
  }

  /*
   * ============================
   * PRICE
   * ============================
   */

  function formatPrice(cents) {
    const currency =
      window.Shopify &&
      Shopify.currency &&
      Shopify.currency.active
        ? Shopify.currency.active
        : 'USD';

    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(cents / 100);
  }

  /*
   * ============================
   * GRID + OPEN POPUP
   * ============================
   */

  function initGridButtons() {
    document
      .querySelectorAll('.grid-popup-btn')
      .forEach(function (button) {
        button.addEventListener('click', function (event) {
          event.preventDefault();

          const handle = button.dataset.productHandle;

          if (!handle) return;

          openPopup(handle);
        });
      });
  }

  function openPopup(handle) {
    currentProduct = null;
    currentVariant = null;

    resetPopup();

    popup.classList.add('is-open');
    document.body.classList.add('popup-open');

    fetch('/products/' + handle + '.js')
      .then(function (response) {
        if (!response.ok) {
          throw new Error('Product not found');
        }

        return response.json();
      })
      .then(function (product) {
        currentProduct = product;

        renderPopup(product);
      })
      .catch(function (error) {
        console.error('Popup product error:', error);

        showError('Failed to load product. Please try again.');
      });
  }

  function closePopup() {
    if (!popup) return;

    popup.classList.remove('is-open');
    document.body.classList.remove('popup-open');

    currentProduct = null;
    currentVariant = null;
  }

  /*
   * ============================
   * RESET
   * ============================
   */

  function resetPopup() {
    if (popupImg) {
      popupImg.src = '';
      popupImg.alt = '';
    }

    popupTitle.textContent = '';
    popupPrice.textContent = '';
    popupDesc.innerHTML = '';
    popupVariants.innerHTML = '';

    hideError();

    addBtn.disabled = true;
    addBtn.classList.remove('is-loading');
    addBtn.style.opacity = '0.5';

    addBtn.innerHTML = `
      <span>ADD TO CART</span>
      <span class="popup-arrow">→</span>
    `;
  }

  /*
   * ============================
   * RENDER PRODUCT
   * ============================
   */

  function renderPopup(product) {
    popupImg.src =
      product.featured_image ||
      (product.images && product.images[0]) ||
      '';

    popupImg.alt = product.title || '';

    popupTitle.textContent = product.title || '';

    popupPrice.textContent = formatPrice(
      product.price
    );

    popupDesc.innerHTML =
      product.description || '';

    popupVariants.innerHTML = '';

    if (
      product.options &&
      product.options.length
    ) {
      product.options.forEach(function (option, index) {
        renderOption(option, index);
      });
    }

    updateVariant();
  }

  /*
   * ============================
   * RENDER OPTIONS
   * ============================
   */

  function renderOption(option, optionIndex) {
    const wrapper =
      document.createElement('div');

    wrapper.className =
      'popup-variant-group';

    const label =
      document.createElement('label');

    label.className =
      'popup-variant-label';

    label.textContent =
      option.name;

    wrapper.appendChild(label);

    /*
     * COLOR
     */

    if (
      option.name &&
      option.name.toLowerCase() === 'color'
    ) {
      const buttonsWrapper =
        document.createElement('div');

      buttonsWrapper.className =
        'color-buttons';

      option.values.forEach(function (value, index) {
        const button =
          document.createElement('button');

        button.type = 'button';

        button.className =
          'color-btn' +
          (index === 0
            ? ' is-active'
            : '');

        button.dataset.optionIndex =
          optionIndex;

        button.dataset.value =
          value;

        button.textContent =
          value;

        button.addEventListener(
          'click',
          function () {

            buttonsWrapper
              .querySelectorAll('.color-btn')
              .forEach(function (btn) {
                btn.classList.remove(
                  'is-active'
                );
              });

            button.classList.add(
              'is-active'
            );

            updateVariant();
          }
        );

        buttonsWrapper.appendChild(button);
      });

      wrapper.appendChild(
        buttonsWrapper
      );
    }

    /*
     * SIZE / OTHER OPTIONS
     */

    else {
      const select =
        document.createElement('select');

      select.className =
        'popup-variant-select';

      select.dataset.optionIndex =
        optionIndex;

      /*
       * Placeholder
       */

      const placeholder =
        document.createElement('option');

      placeholder.value = '';

      placeholder.textContent =
        option.name.toLowerCase() === 'size'
          ? 'Choose your size'
          : 'Choose ' + option.name;

      placeholder.disabled = true;
      placeholder.selected = true;

      select.appendChild(
        placeholder
      );

      /*
       * Values
       */

      option.values.forEach(function (value) {
        const optionElement =
          document.createElement('option');

        optionElement.value =
          value;

        optionElement.textContent =
          value;

        select.appendChild(
          optionElement
        );
      });

      select.addEventListener(
        'change',
        updateVariant
      );

      wrapper.appendChild(
        select
      );
    }

    popupVariants.appendChild(
      wrapper
    );
  }

  /*
   * ============================
   * GET SELECTED OPTIONS
   * ============================
   */

  function getSelectedOptions() {
    if (!currentProduct) {
      return [];
    }

    const selected = [];

    currentProduct.options.forEach(
      function (option, index) {

        /*
         * Color button
         */

        if (
          option.name &&
          option.name.toLowerCase() === 'color'
        ) {
          const activeButton =
            popupVariants.querySelector(
              '.color-btn.is-active[data-option-index="' +
              index +
              '"]'
            );

          selected[index] =
            activeButton
              ? activeButton.dataset.value
              : '';
        }

        /*
         * Select
         */

        else {
          const select =
            popupVariants.querySelector(
              '.popup-variant-select[data-option-index="' +
              index +
              '"]'
            );

          selected[index] =
            select
              ? select.value
              : '';
        }
      }
    );

    return selected;
  }

  /*
   * ============================
   * FIND VARIANT
   * ============================
   */

  function getSelectedVariant() {
    if (!currentProduct) {
      return null;
    }

    if (
      currentProduct.variants.length === 1
    ) {
      return currentProduct.variants[0];
    }

    const selected =
      getSelectedOptions();

    /*
     * لو لسه فيه option مش متختار
     */

    if (
      selected.some(function (value) {
        return !value;
      })
    ) {
      return null;
    }

    return currentProduct.variants.find(
      function (variant) {

        return variant.options.every(
          function (optionValue, index) {

            return (
              optionValue ===
              selected[index]
            );
          }
        );
      }
    ) || null;
  }

  /*
   * ============================
   * UPDATE VARIANT
   * ============================
   */

  function updateVariant() {
    currentVariant =
      getSelectedVariant();

    if (!currentVariant) {
      addBtn.disabled = true;
      addBtn.style.opacity = '0.5';

      return;
    }

    /*
     * Update price
     */

    popupPrice.textContent =
      formatPrice(
        currentVariant.price
      );

    /*
     * Check availability
     */

    if (
      currentVariant.available === false
    ) {
      addBtn.disabled = true;
      addBtn.style.opacity = '0.5';

      addBtn.innerHTML = `
        <span>SOLD OUT</span>
      `;

      return;
    }

    addBtn.disabled = false;
    addBtn.style.opacity = '1';

    addBtn.innerHTML = `
      <span>ADD TO CART</span>
      <span class="popup-arrow">→</span>
    `;
  }

  /*
   * ============================
   * AUTO ADD
   * ============================
   */

  function shouldAutoAdd(variant) {
    if (
      !variant ||
      !variant.options
    ) {
      return false;
    }

    const options =
      variant.options.map(function (value) {
        return String(value).toLowerCase();
      });

    return AUTO_ADD_OPTIONS.every(
      function (requiredOption) {
        return options.includes(
          requiredOption.toLowerCase()
        );
      }
    );
  }

  /*
   * ============================
   * ADD TO CART
   * ============================
   */

  function addToCart() {
    if (
      !currentVariant ||
      addBtn.disabled
    ) {
      return;
    }

    addBtn.disabled = true;

    addBtn.classList.add(
      'is-loading'
    );

    addBtn.innerHTML = `
      <span>ADDING...</span>
    `;

    hideError();

    const autoAdd =
      shouldAutoAdd(
        currentVariant
      );

    /*
     * Add selected product
     */

    fetch('/cart/add.js', {
      method: 'POST',

      headers: {
        'Content-Type':
          'application/json'
      },

      body: JSON.stringify({
        items: [
          {
            id: currentVariant.id,
            quantity: 1
          }
        ]
      })
    })
      .then(function (response) {

        if (!response.ok) {
          throw new Error(
            'Failed to add product'
          );
        }

        return response.json();
      })

      /*
       * Auto add Jacket
       */

      .then(function () {

        if (autoAdd) {
          return addAutoProduct();
        }

        return null;
      })

      /*
       * Success
       */

      .then(function () {

        addBtn.classList.remove(
          'is-loading'
        );

        addBtn.innerHTML = `
          <span>ADDED!</span>
        `;

        updateCartCount();

        setTimeout(function () {
          closePopup();
        }, 1200);
      })

      /*
       * Error
       */

      .catch(function (error) {

        console.error(
          'Add to cart error:',
          error
        );

        showError(
          'Failed to add to cart. Please try again.'
        );

        addBtn.disabled = false;

        addBtn.classList.remove(
          'is-loading'
        );

        addBtn.innerHTML = `
          <span>ADD TO CART</span>
          <span class="popup-arrow">→</span>
        `;
      });
  }

  /*
   * ============================
   * AUTO ADD PRODUCT
   * ============================
   */

  function addAutoProduct() {

    return fetch(
      '/products/' +
      AUTO_ADD_HANDLE +
      '.js'
    )
      .then(function (response) {

        if (!response.ok) {
          throw new Error(
            'Auto product not found'
          );
        }

        return response.json();
      })

      .then(function (product) {

        if (
          !product ||
          !product.variants ||
          !product.variants.length
        ) {
          return;
        }

        /*
         * Find Black + Medium variant
         */

        const autoVariant =
          product.variants.find(
            function (variant) {

              return (
                variant.options &&
                AUTO_ADD_OPTIONS.every(
                  function (requiredOption) {

                    return variant.options.some(
                      function (value) {

                        return (
                          String(value)
                            .toLowerCase() ===
                          requiredOption
                            .toLowerCase()
                        );
                      }
                    );
                  }
                )
              );
            }
          );

        if (!autoVariant) {
          console.warn(
            'Black + Medium variant not found.'
          );

          return;
        }

        return fetch(
          '/cart/add.js',
          {
            method: 'POST',

            headers: {
              'Content-Type':
                'application/json'
            },

            body: JSON.stringify({
              items: [
                {
                  id: autoVariant.id,
                  quantity: 1
                }
              ]
            })
          }
        );
      });
  }

  /*
   * ============================
   * CART COUNT
   * ============================
   */

  function updateCartCount() {

    fetch('/cart.js')
      .then(function (response) {
        return response.json();
      })
      .then(function (cart) {

        document
          .querySelectorAll(
            '[data-cart-count]'
          )
          .forEach(function (element) {

            element.textContent =
              cart.item_count;
          });
      })
      .catch(function (error) {
        console.warn(
          'Cart count error:',
          error
        );
      });
  }

  /*
   * ============================
   * ERROR
   * ============================
   */

  function showError(message) {

    if (!errorMsg) return;

    errorMsg.textContent =
      message;

    errorMsg.style.display =
      'block';
  }

  function hideError() {

    if (!errorMsg) return;

    errorMsg.textContent = '';

    errorMsg.style.display =
      'none';
  }

  /*
   * ============================
   * CONTROLS
   * ============================
   */

  function initPopupControls() {

    if (closeBtn) {
      closeBtn.addEventListener(
        'click',
        closePopup
      );
    }

    if (overlay) {
      overlay.addEventListener(
        'click',
        closePopup
      );
    }

    if (addBtn) {
      addBtn.addEventListener(
        'click',
        addToCart
      );
    }

    document.addEventListener(
      'keydown',
      function (event) {

        if (
          event.key === 'Escape' &&
          popup.classList.contains(
            'is-open'
          )
        ) {
          closePopup();
        }
      }
    );
  }

  /*
   * ============================
   * START
   * ============================
   */

  if (
    document.readyState ===
    'loading'
  ) {
    document.addEventListener(
      'DOMContentLoaded',
      init
    );
  } else {
    init();
  }

})();