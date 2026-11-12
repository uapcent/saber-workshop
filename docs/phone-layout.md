# Phone layout

The app is designed for computers first. Below 900px wide, `styles.css` turns the desktop layout into one column:

- **Drawing first, pinned.** The saber drawing stays at the top of the screen while you scroll. Tapping a part opens it
  in the editor below.
- **Then the editor, Compare and the shopping list**, in that order.
- **Saber switcher: four fixed slots** under the title, one per saber (the workshop holds at most four). Each slot shows
  a small drawing of that saber and its name on up to two lines, so every saber is always on screen and the row never
  scrolls. "+ Add" takes the next free slot and opens the same add menu as desktop.
- **Menus open as bottom sheets** over a dimmed page, and tap targets and field text are larger.

## Decided against

An earlier idea was a phone-native layout: the hilt drawn upright, tapping a part to open a sheet with its settings, and
no parts list. It was dropped. The stacked layout keeps the drawing and all the information on screen at once, and
hiding it behind taps would be worse.
