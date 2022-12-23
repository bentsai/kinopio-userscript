// ==UserScript==
// @name         Kinopio
// @namespace    http://tampermonkey.net/
// @version      1.1
// @description  experiment with new kinopio interactions
// @author       You
// @match        https://kinopio.club/*
// @icon         data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==
// @grant        none
// ==/UserScript==

(function () {
  "use strict";

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
    let originCard = {};
    let previousCardId = "";
    let isDraggingCardId = "";
    let isResizingCard = false;
    let lastDetectedRemovedCardsCount =
      store.state.currentCards.removedCards.length;

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
        if (previousCardId) {
          document.dispatchEvent(
            new CustomEvent("cardEditEnded", {
              detail: {
                card: store.state.curentCards.cards[previousCardId],
              },
            })
          );
        }

        document.dispatchEvent(
          new CustomEvent("cardEditStarted", {
            detail: {
              card: store.state.currentCards.cards[currentCardId],
            },
          })
        );
      }

      if (!isCardDetailsOpen && currentCardId) {
        previousCardId = currentCardId;
        currentCardId = "";
        if (previousCardId && store.state.currentCards.cards[previousCardId]) {
          document.dispatchEvent(
            new CustomEvent("cardEditEnded", {
              detail: {
                card: store.state.currentCards.cards[previousCardId],
              },
            })
          );
        }
      }

      if (!isDraggingCardId && store.state.currentDraggingCardId) {
        // Card drag started
        isDraggingCardId = store.state.currentDraggingCardId;

        // Keep track of where the card started
        originCard = {
          ...store.state.currentCards.cards[isDraggingCardId],
        };
      } else if (isDraggingCardId && !store.state.currentDraggingCardId) {
        document.dispatchEvent(
          new CustomEvent("cardDragEnded", {
            detail: {
              card: store.state.currentCards.cards[isDraggingCardId],
            },
          })
        );
        isDraggingCardId = "";
      }

      if (!isResizingCard && store.state.currentUserIsResizingCard) {
        isResizingCard = true;
      } else if (isResizingCard && !store.state.currentUserIsResizingCard) {
        document.dispatchEvent(
          new CustomEvent("cardResizeEnded", {
            detail: {
              card: store.state.currentCards.cards[
                store.state.currentUserIsResizingCardIds[0]
              ],
            },
          })
        );
        isResizingCard = false;
      }

      if (
        lastDetectedRemovedCardsCount <
        store.state.currentCards.removedCards.length
      ) {
        let cardsRemovedCount =
          store.state.currentCards.removedCards.length -
          lastDetectedRemovedCardsCount;
        console.log("🎴", cardsRemovedCount, "cards were removed.");
        for (let index = 0; index < cardsRemovedCount; index++) {
          document.dispatchEvent(
            new CustomEvent("cardRemoved", {
              detail: {
                card: store.state.currentCards.removedCards[index],
              },
            })
          );
        }
      }
      lastDetectedRemovedCardsCount =
        store.state.currentCards.removedCards.length;
    }, 50);

    let resizeBoxes = (card) => {
      if (!card) return;

      Object.values(store.state.currentBoxes.boxes).forEach((box) => {
        if (box.fill === "filled") {
          let yMargin = 12;
          // if card is inside box
          if (
            card.x >= box.x &&
            card.x < box.x + box.resizeWidth &&
            card.y >= box.y &&
            card.y < box.y + box.resizeHeight
          ) {
            console.log("🎴", "resizing", box.id, box.name, "because of", card);

            let currentCards = Object.values(store.state.currentCards.cards);
            let cardsInBox = currentCards.filter(
              (c) =>
                c.x >= box.x &&
                c.x < box.x + box.resizeWidth &&
                c.y >= box.y &&
                c.y < box.y + box.resizeHeight
            );

            cardsInBox.sort((a, b) => a.y - b.y);

            if (store.state.multipleCardsSelectedIds.length > 1) {
              let draggedCardIndex = cardsInBox.findIndex(
                (c) => c.id === store.state.multipleCardsSelectedIds[0]
              );

              if (draggedCardIndex >= 0) {
                let otherSelectedCards =
                  store.state.multipleCardsSelectedIds.map(
                    (id) => store.state.currentCards.cards[id]
                  );
                otherSelectedCards = otherSelectedCards.filter(
                  (c) => c.id !== store.state.multipleCardsSelectedIds[0]
                );
                cardsInBox = cardsInBox.filter(
                  (c) => !otherSelectedCards.map((c) => c.id).includes(c.id)
                );
                cardsInBox.splice(
                  cardsInBox.findIndex(
                    (c) => c.id === store.state.multipleCardsSelectedIds[0]
                  ) + 1,
                  0,
                  ...otherSelectedCards
                );
              } else {
                console.log("🎴", "selection was dragged out of box");
              }
            }

            console.log("🎴", "cards to arrange", ...cardsInBox);

            if (cardsInBox.length > 0) {
              // tidy the cards in order of y
              let x = box.x + 20;
              let y = box.y + 52;
              let maxWidth = cardsInBox[0].width;
              for (let index = 0; index < cardsInBox.length; index++) {
                const element = cardsInBox[index];
                store.dispatch("currentCards/update", {
                  ...element,
                  x: x,
                  y: y,
                });
                maxWidth = Math.max(maxWidth, element.width);
                y += element.height + yMargin;
              }
              store.dispatch("currentBoxes/update", {
                ...box,
                resizeWidth: maxWidth + 48,
                resizeHeight: y - box.y + 48,
              });
            }
          }
        } else if (box.fill === "empty") {
          if (
            card.x + card.width >= box.x &&
            card.x < box.x + box.resizeWidth &&
            card.y + card.height >= box.y &&
            card.y < box.y + box.resizeHeight
          ) {
            console.log("🎴", "resizing", box, "because of", card);
            if (card.x + card.width > box.x + box.resizeWidth - 24) {
              // Handle east
              store.dispatch("currentBoxes/update", {
                ...box,
                resizeWidth: card.x + card.width + 48 - box.x,
              });
            }
            if (card.y + card.height > box.y + box.resizeHeight - 24) {
              // Handle south
              store.dispatch("currentBoxes/update", {
                ...box,
                resizeHeight: card.y + card.height + 48 - box.y,
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
            if (
              originCard.x >= box.x &&
              originCard.x < box.x + box.resizeWidth &&
              originCard.y >= box.y &&
              originCard.y < box.y + box.resizeHeight
            ) {
              // Find another card in the same box and trigger a resize
              let otherCard = Object.values(
                store.state.currentCards.cards
              ).find(
                (c) =>
                  c.x >= box.x &&
                  c.x < box.x + box.resizeWidth &&
                  c.y >= box.y &&
                  c.y < box.y + box.resizeHeight
              );
              resizeBoxes(store.state.currentCards.cards[otherCard.id]);
            }
          }
        });
        return;
      }

      resizeBoxes(e.detail.card);
    });

    document.addEventListener("cardDragEnded", (e) => {
      console.log("🎴", e.type, originCard, "was dragged");
      // This intends to provoke resize logic for when a card is dragged out of a box.
      // `currentCard` is tracking where the dragged card originated.
      resizeBoxes(originCard);

      // This detects when a card was dragged in
      console.log("🎴", e.type, e.detail.card.id);
      resizeBoxes(e.detail.card);
      originCard = {};
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
