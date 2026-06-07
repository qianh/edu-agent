import { test, expect } from '@playwright/test'

test.describe('学生管理', () => {
  test('学生列表页可正常加载', async ({ page }) => {
    await page.goto('/students')
    await expect(page.getByText('总学生数')).toBeVisible()
    await expect(page.locator('table')).toBeVisible()
  })
})

test.describe('作业上传向导', () => {
  test('三步向导可完成', async ({ page }) => {
    await page.goto('/assignments/upload')
    await expect(page.getByText('基本信息')).toBeVisible()

    await page.fill('input[placeholder*="作业名称"]', '测试作业')
    await page.click('button:has-text("下一步")')

    await expect(page.getByText('批阅模式')).toBeVisible()
  })
})

test.describe('试题生成', () => {
  test('生成页面可正常加载', async ({ page }) => {
    await page.goto('/questions/generate')
    await expect(page.getByText('个性化试题生成')).toBeVisible()
    await expect(page.getByText('生成参数')).toBeVisible()
  })
})
