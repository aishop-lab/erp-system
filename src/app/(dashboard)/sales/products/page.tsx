'use client'

import { useState, useEffect } from 'react'
import { PageHeader } from '@/components/shared/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Package, ShoppingCart, IndianRupee, Layers } from 'lucide-react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
  Legend,
} from 'recharts'

const PIE_COLORS = [
  'hsl(215, 70%, 55%)', 'hsl(142, 76%, 36%)', 'hsl(48, 96%, 53%)',
  'hsl(0, 84%, 60%)', 'hsl(280, 65%, 50%)', 'hsl(200, 65%, 50%)',
  'hsl(330, 65%, 50%)', 'hsl(160, 60%, 45%)', 'hsl(30, 80%, 50%)',
  'hsl(100, 50%, 40%)',
]

export default function ProductPerformancePage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [days, setDays] = useState('365')

  useEffect(() => {
    setLoading(true)
    fetch(`/api/sales/products?days=${days}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [days])

  const fmt = (n: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n)

  const fmtCompact = (n: number) => {
    if (n >= 100000) return `${(n / 100000).toFixed(1)} L`
    if (n >= 1000) return `${(n / 1000).toFixed(1)} K`
    return n.toFixed(0)
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Product Performance" description="Top sellers, style & color analysis, size distribution" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1,2,3,4].map(i => (
            <Card key={i}><CardContent className="pt-6"><div className="h-16 animate-pulse rounded bg-muted" /></CardContent></Card>
          ))}
        </div>
        <Card><CardContent className="pt-6"><div className="h-[300px] animate-pulse rounded bg-muted" /></CardContent></Card>
      </div>
    )
  }

  if (!data) {
    return <div className="flex items-center justify-center py-20 text-muted-foreground">Failed to load data</div>
  }

  const ProductTable = ({ items, showRank = true }: { items: any[]; showRank?: boolean }) => (
    <Table>
      <TableHeader>
        <TableRow>
          {showRank && <TableHead className="w-12">#</TableHead>}
          <TableHead>Product</TableHead>
          <TableHead>SKU</TableHead>
          <TableHead>Color</TableHead>
          <TableHead>Size</TableHead>
          <TableHead>Style</TableHead>
          <TableHead className="text-right">Orders</TableHead>
          <TableHead className="text-right">Qty</TableHead>
          <TableHead className="text-right">Revenue</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((item: any, i: number) => (
          <TableRow key={i}>
            {showRank && <TableCell className="font-medium text-muted-foreground">{i + 1}</TableCell>}
            <TableCell className="font-medium max-w-[200px] truncate">{item.productName}</TableCell>
            <TableCell className="font-mono text-xs">{item.sku}</TableCell>
            <TableCell>{item.color}</TableCell>
            <TableCell>{item.size}</TableCell>
            <TableCell>{item.styleName}</TableCell>
            <TableCell className="text-right">{item.orders}</TableCell>
            <TableCell className="text-right">{item.qty}</TableCell>
            <TableCell className="text-right font-medium">{fmt(item.revenue)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title="Product Performance"
        description="Top sellers, style & color analysis, size distribution"
        breadcrumbs={[
          { label: 'Sales', href: '/sales/orders' },
          { label: 'Products' },
        ]}
        actions={
          <Select value={days} onValueChange={setDays}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
              <SelectItem value="365">Last year</SelectItem>
              <SelectItem value="0">All time</SelectItem>
            </SelectContent>
          </Select>
        }
      />

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Products Sold</p>
                <p className="text-2xl font-bold">{data.summary.productsSold}</p>
              </div>
              <Package className="h-8 w-8 text-muted-foreground/30" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Catalog Size</p>
                <p className="text-2xl font-bold">{data.summary.catalogSize}</p>
              </div>
              <Layers className="h-8 w-8 text-muted-foreground/30" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Revenue/Product</p>
                <p className="text-2xl font-bold">{fmt(data.summary.avgRevenuePerProduct)}</p>
              </div>
              <IndianRupee className="h-8 w-8 text-muted-foreground/30" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Orders/Product</p>
                <p className="text-2xl font-bold">{data.summary.avgOrdersPerProduct.toFixed(1)}</p>
              </div>
              <ShoppingCart className="h-8 w-8 text-muted-foreground/30" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="top-sellers">
        <TabsList>
          <TabsTrigger value="top-sellers">Top Sellers</TabsTrigger>
          <TabsTrigger value="by-style">By Style</TabsTrigger>
          <TabsTrigger value="by-color">By Color</TabsTrigger>
          <TabsTrigger value="by-size">By Size</TabsTrigger>
          <TabsTrigger value="slow-movers">Slow Movers</TabsTrigger>
        </TabsList>

        <TabsContent value="top-sellers">
          <Card>
            <CardHeader>
              <CardTitle>Top 20 Products by Revenue</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ProductTable items={data.topSellers} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="by-style">
          <div className="space-y-6">
            {data.byStyle?.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Revenue by Style</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={Math.max(250, data.byStyle.length * 40)}>
                    <BarChart data={data.byStyle} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                      <XAxis type="number" tickFormatter={fmtCompact} />
                      <YAxis type="category" dataKey="styleName" width={160} />
                      <Tooltip formatter={(v: any) => fmt(Number(v))} />
                      <Bar dataKey="revenue" name="Revenue" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
            <Card>
              <CardHeader>
                <CardTitle>Style Breakdown</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Style</TableHead>
                      <TableHead className="text-right">Products</TableHead>
                      <TableHead className="text-right">Orders</TableHead>
                      <TableHead className="text-right">Qty Sold</TableHead>
                      <TableHead className="text-right">Revenue</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.byStyle.map((s: any) => (
                      <TableRow key={s.styleName}>
                        <TableCell className="font-medium">{s.styleName}</TableCell>
                        <TableCell className="text-right">{s.products}</TableCell>
                        <TableCell className="text-right">{s.orders}</TableCell>
                        <TableCell className="text-right">{s.qty}</TableCell>
                        <TableCell className="text-right font-medium">{fmt(s.revenue)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="by-color">
          <div className="space-y-6">
            {data.byColor?.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Revenue by Color</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={data.byColor.slice(0, 10)}
                        dataKey="revenue"
                        nameKey="color"
                        cx="50%"
                        cy="50%"
                        outerRadius={110}
                        label={({ name, payload }: any) => `${name} (${payload?.pct?.toFixed(1) || 0}%)`}
                      >
                        {data.byColor.slice(0, 10).map((_: any, i: number) => (
                          <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: any) => fmt(Number(v))} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
            <Card>
              <CardHeader>
                <CardTitle>Color Breakdown</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Color</TableHead>
                      <TableHead className="text-right">Orders</TableHead>
                      <TableHead className="text-right">Qty Sold</TableHead>
                      <TableHead className="text-right">Revenue</TableHead>
                      <TableHead className="text-right">Share %</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.byColor.map((c: any) => (
                      <TableRow key={c.color}>
                        <TableCell className="font-medium">{c.color}</TableCell>
                        <TableCell className="text-right">{c.orders}</TableCell>
                        <TableCell className="text-right">{c.qty}</TableCell>
                        <TableCell className="text-right font-medium">{fmt(c.revenue)}</TableCell>
                        <TableCell className="text-right">{c.pct.toFixed(1)}%</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="by-size">
          <div className="space-y-6">
            {data.bySize?.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Size Curve (Qty Sold)</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={data.bySize}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="size" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="qty" name="Quantity" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
            <Card>
              <CardHeader>
                <CardTitle>Size Breakdown</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Size</TableHead>
                      <TableHead className="text-right">Orders</TableHead>
                      <TableHead className="text-right">Qty Sold</TableHead>
                      <TableHead className="text-right">Revenue</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.bySize.map((s: any) => (
                      <TableRow key={s.size}>
                        <TableCell className="font-medium">{s.size}</TableCell>
                        <TableCell className="text-right">{s.orders}</TableCell>
                        <TableCell className="text-right">{s.qty}</TableCell>
                        <TableCell className="text-right font-medium">{fmt(s.revenue)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="slow-movers">
          <Card>
            <CardHeader>
              <CardTitle>Bottom 20 Products by Revenue</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ProductTable items={data.slowMovers} showRank={false} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
