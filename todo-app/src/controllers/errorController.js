export function renderNotFound(req, res) {
  res.status(404).render('404', { title: 'Не найдено' })
}
