export const fixNames = (item) => {
  var result = {}

  for (let name of Object.keys(item)) {
    const value = item[name]
    const fixedName = name.replace(/\w+_/,'')
    result[fixedName] = value
  }

  return result
}
