export type ProductLine = {
  product: string
  quantity: number
  productCode: string
}

const PRODUCT_LINE_SEPARATOR = ' || '

export function createEmptyProductLine(): ProductLine {
  return {
    product: '',
    quantity: 1,
    productCode: '',
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
      const [product = '', quantityValue = '', productCode = ''] = line.split(PRODUCT_LINE_SEPARATOR)
      const parsedQuantity = Number(quantityValue)

      return {
        product: product.trim(),
        quantity: Number.isFinite(parsedQuantity) && parsedQuantity > 0 ? parsedQuantity : 1,
        productCode: productCode.trim(),
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
    },
  ]
}

export function serializeProductLines(lines: ProductLine[]) {
  return lines
    .map(normalizeProductLine)
    .filter((line) => line.product)
    .map((line) => [line.product, String(line.quantity), line.productCode].join(PRODUCT_LINE_SEPARATOR))
    .join('\n')
}

export function normalizeProductLine(line: ProductLine): ProductLine {
  return {
    product: line.product.trim(),
    quantity: Number.isFinite(line.quantity) && line.quantity > 0 ? line.quantity : 1,
    productCode: line.productCode.trim(),
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
