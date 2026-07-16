export type ProductLine = {
  product: string
  quantity: number
  productCode: string
  size: string
}

const PRODUCT_LINE_SEPARATOR = ' || '

export function createEmptyProductLine(): ProductLine {
  return {
    product: '',
    quantity: 1,
    productCode: '',
    size: '',
  }
}

export function parseProductDescription(
  productDescription?: string | null,
  fallbackQuantity?: number | null
): ProductLine[] {
  if (!productDescription?.trim()) {
    return [createEmptyProductLine()]
  }

  const parsedLines = productDescription
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split(PRODUCT_LINE_SEPARATOR)
      const isLegacyLine = parts.length <= 3 && Number.isFinite(Number(parts[1]))
      const [productCode = '', product = '', size = '', quantityValue = ''] = isLegacyLine
        ? [parts[2] ?? '', parts[0] ?? '', '', parts[1] ?? '']
        : parts
      const parsedQuantity = Number(quantityValue)

      return {
        product: product.trim(),
        quantity: Number.isFinite(parsedQuantity) && parsedQuantity > 0 ? parsedQuantity : 1,
        productCode: productCode.trim(),
        size: size.trim(),
      }
    })
    .filter((line) => line.product)

  if (parsedLines.length > 0) {
    return parsedLines
  }

  return [
    {
      product: productDescription.trim(),
      quantity: fallbackQuantity && fallbackQuantity > 0 ? fallbackQuantity : 1,
      productCode: '',
      size: '',
    },
  ]
}

export function serializeProductLines(lines: ProductLine[]) {
  return lines
    .map(normalizeProductLine)
    .filter((line) => line.product)
    .map((line) =>
      [line.productCode, line.product, line.size, String(line.quantity)].join(PRODUCT_LINE_SEPARATOR)
    )
    .join('\n')
}

export function normalizeProductLine(line: ProductLine): ProductLine {
  return {
    product: line.product.trim(),
    quantity: Number.isFinite(line.quantity) && line.quantity > 0 ? line.quantity : 1,
    productCode: line.productCode.trim(),
    size: line.size.trim(),
  }
}

export function normalizeProductLines(lines: ProductLine[]) {
  return lines.map(normalizeProductLine).filter((line) => line.product)
}

export function getTotalQuantity(lines: ProductLine[]) {
  const total = lines.reduce((sum, line) => {
    const quantity = Number.isFinite(line.quantity) && line.quantity > 0 ? line.quantity : 0
    return sum + quantity
  }, 0)

  return total > 0 ? total : 1
}
