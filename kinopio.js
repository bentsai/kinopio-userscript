// ==UserScript==
// @name         Kinopio
// @namespace    http://tampermonkey.net/
// @version      0.8
// @description  experiment with new kinopio interactions
// @author       You
// @match        https://kinopio.club/*
// @icon         data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==
// @grant        none
// ==/UserScript==

(function() {
  'use strict';

  let toggleChrome = () => {
    const display =
          document.querySelector("header").style.display === "none" ? "" : "none";
    document.querySelector("header").style.display = display;
    document.querySelector("footer").style.display = display;
    document.querySelector(".footer-wrap").style.display = display;
  };

  document.body.addEventListener("keydown", (e) => {
    if (document.querySelector("dialog[open]")) return;
    if (e.key === "d") toggleChrome();
  });

  document.addEventListener("DOMContentLoaded", function () {
    let store =
        document.querySelector("#app").__vue_app__.config.globalProperties.$store;

    let currentCardId = "";
    let currentCard = {};
    let previousCardId = "";
    let isDraggingCardId = "";
    let isResizingCard = false;
    let lastDetectedCardCount = store.state.currentCards.ids.length;

    // ==========================
    // Detect and dispatch events
    // ==========================
    let intervalId = setInterval(() => {
      let isCardDetailsOpen = document.querySelector(".card-details");

      if (
        isCardDetailsOpen &&
        isCardDetailsOpen.getAttribute("data-card-id") != currentCardId
      ) {
        // Detects when card details opens
        previousCardId = currentCardId;
        currentCardId = isCardDetailsOpen.getAttribute("data-card-id");
        document.dispatchEvent(
          new CustomEvent("cardEditEnded", {
            detail: { card: store.state.currentCards.cards[previousCardId] }
          })
        );

        currentCard = store.state.currentCards.cards[currentCardId];
        document.dispatchEvent(
          new CustomEvent("cardEditStarted", {
            detail: { card: store.state.currentCards.cards[currentCardId] }
          })
        );
      }

      if (!isCardDetailsOpen && currentCardId) {
        previousCardId = currentCardId;
        currentCardId = "";
        document.dispatchEvent(
          new CustomEvent("cardEditEnded", {
            detail: { card: store.state.currentCards.cards[previousCardId] }
          })
        );
      }

      if (!isDraggingCardId && store.state.currentDraggingCardId) {
        isDraggingCardId = store.state.currentDraggingCardId;

        // Keep track of where the card started
        currentCard = { ...store.state.currentCards.cards[isDraggingCardId] };
      } else if (isDraggingCardId && !store.state.currentDraggingCardId) {
        document.dispatchEvent(
          new CustomEvent("cardDragEnded", {
            detail: { card: store.state.currentCards.cards[isDraggingCardId] }
          })
        );
        isDraggingCardId = "";
      }

      if (!isResizingCard && store.state.currentUserIsResizingCard) {
        isResizingCard = true;
      } else if (isResizingCard && !store.state.currentUserIsResizingCard) {
        document.dispatchEvent(
          new CustomEvent("cardResizeEnded", {
            detail: { card: store.state.currentCards.cards[store.state.currentUserIsResizingCardIds[0]] },
          })
        );
        isResizingCard = false;
      }

      if (lastDetectedCardCount > store.state.currentCards.ids.length) {
        console.log("🎴", lastDetectedCardCount - store.state.currentCards.ids.length , "cards were removed.")
        document.dispatchEvent(
          new CustomEvent("cardRemoved", {
            detail: { card: store.state.currentCards.removedCards[0] },
          })
        );
      }
      lastDetectedCardCount = store.state.currentCards.ids.length;
    }, 50);

    let resizeBoxes = (card) => {
      if (!card) return;
      console.log("🎴", "resizing boxes in relation to", card);

      Object.values(store.state.currentBoxes.boxes).forEach((box) => {
        if (box.fill === "filled") {
          // if card is inside box
          if (card.x >= box.x &&
              card.x < box.x + box.resizeWidth &&
              card.y >= box.y &&
              card.y < box.y + box.resizeHeight) {
            let cardsInBox = Object.values(store.state.currentCards.cards).filter(
              c => c.x >= box.x &&
              c.x < box.x + box.resizeWidth &&
              c.y >= box.y &&
              c.y < box.y + box.resizeHeight)

            cardsInBox.sort((a, b) => a.y - b.y)

            // tidy the cards in order of y
            let x = box.x + 20;
            let y = box.y + 52;
            let maxWidth = cardsInBox[0].resizeWidth > 0 ?
                cardsInBox[0].resizeWidth : cardsInBox[0].width;
            for (let index = 0; index < cardsInBox.length; index++) {
              const element = cardsInBox[index];
              store.dispatch("currentCards/update", {
                ...element,
                x: x,
                y: y,
              });
              maxWidth = Math.max(maxWidth,
                                  element.resizeWidth > 0 ?
                                  element.resizeWidth : element.width);
              y += element.height + 12;
            }
            store.dispatch("currentBoxes/update", {
              ...box,
              resizeWidth: maxWidth + 48,
              resizeHeight: y - box.y + 48,
            });
          }
        } else if (box.fill === "empty") {
          if (
            card.x + (card.resizeWidth ?? card.width) >= box.x &&
            card.x < box.x + box.resizeWidth &&
            card.y + card.height >= box.y &&
            card.y < box.y + box.resizeHeight
          ) {

            if (
              card.x + (card.resizeWidth ? card.resizeWidth : card.width) >
              box.x + box.resizeWidth - 24
            ) {
              // Handle east
              store.dispatch("currentBoxes/update", {
                ...box,
                resizeWidth: card.x + (card.resizeWidth ?? card.width) + 48 - box.x,
              });
            }
            if (
              card.y + card.height >
              box.y + box.resizeHeight - 24
            ) {
              // Handle south
              store.dispatch("currentBoxes/update", {
                ...box,
                resizeHeight:
                card.y + card.height + 48 - box.y,
              });
            }
            if (card.x < box.x) {
              store.dispatch("currentBoxes/update", {
                ...box,
                x: card.x - 20,
                resizeWidth: box.resizeWidth + box.x - card.x + 20,
              });
            }
            if (card.y < box.y) {
              store.dispatch("currentBoxes/update", {
                ...box,
                y: card.y - 20,
                resizeHeight: box.resizeHeight + box.y - card.y + 20,
              });
            }
          }
        }
      });
    };

    // ==============
    // Event handlers
    // ==============

    document.addEventListener("cardEditStarted", (e) => {
      console.log("🎴", e.type, e.detail.card.id);
      resizeBoxes(e.detail.card);
    });

    document.addEventListener("cardEditEnded", (e) => {
      console.log("🎴", e.type, e.detail.card.id);

      if (!store.state.currentCards.ids.includes(e.detail.card.id)) {
        // Detect when card was removed
        Object.values(store.state.currentBoxes.boxes).forEach((box) => {
          if (box.fill === "filled") {
            // if card is inside box
            if (currentCard.x >= box.x &&
                currentCard.x < box.x + box.resizeWidth &&
                currentCard.y >= box.y &&
                currentCard.y < box.y + box.resizeHeight) {
              // Find another card in the same box and trigger a resize
              let otherCard = Object.values(store.state.currentCards.cards).find(
                c => c.x >= box.x && c.x < box.x + box.resizeWidth &&
                c.y >= box.y && c.y < box.y + box.resizeHeight);
              resizeBoxes(store.state.currentCards.cards[otherCard.id]);
            }
          }
        });
        return;
      }

      resizeBoxes(e.detail.card);

    });

    document.addEventListener("cardDragEnded", (e) => {
      console.log("🎴", e.type, e.detail.card.id);
      resizeBoxes(e.detail.card);
      resizeBoxes(currentCard);
      currentCard = {};
    });
    document.addEventListener("cardResizeEnded", (e) => {
      console.log("🎴", e.type, e.detail.card.id);
      resizeBoxes(e.detail.card);
    });

    document.addEventListener("cardRemoved", (e) => {
      console.log("🎴", e.type, e.detail.card.id);
      resizeBoxes(e.detail.card);
    });
  });

})();
