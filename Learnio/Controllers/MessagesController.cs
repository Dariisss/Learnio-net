using Learnio.Data;
using Learnio.Dtos;
using Learnio.Entities;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Learnio.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class MessagesController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public MessagesController(ApplicationDbContext context)
        {
            _context = context;
        }

        // 1. ОТПРАВИТЬ СООБЩЕНИЕ
        // POST: api/messages
        [HttpPost]
        public async Task<IActionResult> SendMessage([FromBody] CreateMessageDto model)
        {
            // Ищем отправителя
            var sender = await _context.Users.FirstOrDefaultAsync(u => u.Email == model.SenderEmail);
            if (sender == null) return BadRequest("Отправитель не найден");

            // Ищем получателя
            var receiver = await _context.Users.FirstOrDefaultAsync(u => u.Email == model.ReceiverEmail);
            if (receiver == null) return BadRequest("Получатель не найден");

            if (sender.Id == receiver.Id) return BadRequest("Нельзя писать самому себе!");

            var message = new Message
            {
                Id = Guid.NewGuid(),
                SenderId = sender.Id,
                ReceiverId = receiver.Id,
                Text = model.Text,
                SentAt = DateTime.UtcNow,
                IsRead = false
            };

            _context.Messages.Add(message);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Отправлено!" });
        }

        // 2. ПОЛУЧИТЬ ПЕРЕПИСКУ (ДИАЛОГ)
        // GET: api/messages/conversation?user1=...&user2=...
        [HttpGet("conversation")]
        public async Task<IActionResult> GetConversation(string user1Email, string user2Email)
        {
            var user1 = await _context.Users.FirstOrDefaultAsync(u => u.Email == user1Email);
            var user2 = await _context.Users.FirstOrDefaultAsync(u => u.Email == user2Email);

            if (user1 == null || user2 == null) return BadRequest("Один из пользователей не найден");

            // Выбираем сообщения: 
            // Либо (Отправитель=1 и Получатель=2) 
            // Либо (Отправитель=2 и Получатель=1)
            var messages = await _context.Messages
                .Where(m => (m.SenderId == user1.Id && m.ReceiverId == user2.Id) ||
                            (m.SenderId == user2.Id && m.ReceiverId == user1.Id))
                .OrderBy(m => m.SentAt) // Сортируем по времени (старые сверху)
                .Select(m => new
                {
                    m.Id,
                    SenderName = m.Sender.FirstName + " " + m.Sender.LastName,
                    m.Text,
                    SentAt = m.SentAt.ToString("yyyy-MM-dd HH:mm")
                })
                .ToListAsync();

            return Ok(messages);
        }
    }
}