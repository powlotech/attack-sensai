/** Navigator-style entries scoring every technique a group/software uses as 1. */
export const layerEntriesFor = (item) =>
  Object.fromEntries(item.techniques.map((id) => [id, { score: 1, comment: '', learned: false }]))

export const highlightFor = (item) => ({ label: item.name, ids: new Set(item.techniques) })
