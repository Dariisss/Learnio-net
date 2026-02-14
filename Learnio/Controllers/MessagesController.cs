using Learnio.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Learnio.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [AllowAnonymous]
    public class MessagesController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public MessagesController(ApplicationDbContext context)
        {
            _context = context;
        }

        // 1. ОТРИМАТИ КОНТАКТИ З ЛІЧИЛЬНИКОМ НЕПРОЧИТАНИХ
        // GET: api/Messages/contacts/{userId}
        [HttpGet("contacts/{userId}")]
        public async Task<IActionResult> GetContacts(string userId)
        {
            if (string.IsNullOrEmpty(userId)) return BadRequest("UserId is required");

            // Отримуємо список ID всіх, з ким була переписка
            var contactIds = await _context.Messages
                .Where(m => m.SenderId == userId || m.ReceiverId == userId)
                .Select(m => m.SenderId == userId ? m.ReceiverId : m.SenderId)
                .Distinct()
                .ToListAsync();

            // Формуємо список контактів з підрахунком непрочитаних від кожного
            var contacts = await _context.Users
                .Where(u => contactIds.Contains(u.Id))
                .Select(u => new
                {
                    id = u.Id,
                    name = u.FirstName + " " + u.LastName,
                    // Рахуємо повідомлення, де відправник - контакт, отримувач - я, і вони не прочитані
                    unreadCount = _context.Messages.Count(m => m.SenderId == u.Id && m.ReceiverId == userId && !m.IsRead)
                })
                .ToListAsync();

            return Ok(contacts);
        }

        // 2. ІСТОРІЯ ПЕРЕПИСКИ
        // GET: api/Messages/history/{myId}/{interlocutorId}
        [HttpGet("history/{myId}/{interlocutorId}")]
        public async Task<IActionResult> GetHistory(string myId, string interlocutorId)
        {
            var messages = await _context.Messages
                .Where(m => (m.SenderId == myId && m.ReceiverId == interlocutorId) ||
                            (m.SenderId == interlocutorId && m.ReceiverId == myId))
                .OrderBy(m => m.SentAt)
                .Select(m => new
                {
                    m.Id,
                    m.Text,
                    Time = m.SentAt.ToString("HH:mm"),
                    IsMine = m.SenderId == myId,
                    m.IsRead // Додаємо в модель, щоб фронт знав статус
                })
                .ToListAsync();

            return Ok(messages);
        }

        // 3. ПОЗНАЧИТИ ПОВІДОМЛЕННЯ ЯК ПРОЧИТАНІ 🔥
        // POST: api/Messages/read/{myId}/{interlocutorId}
        [HttpPost("read/{myId}/{interlocutorId}")]
        public async Task<IActionResult> MarkAsRead(string myId, string interlocutorId)
        {
            // Знаходимо всі повідомлення від співрозмовника до мене, які ще не прочитані
            var unreadMessages = await _context.Messages
                .Where(m => m.SenderId == interlocutorId && m.ReceiverId == myId && !m.IsRead)
                .ToListAsync();

            if (unreadMessages.Any())
            {
                unreadMessages.ForEach(m => m.IsRead = true);
                await _context.SaveChangesAsync();
            }

            return Ok(new { message = "Messages marked as read" });
        }

        // 4. ЗАГАЛЬНА КІЛЬКІСТЬ НЕПРОЧИТАНИХ (для червоної крапки на язичку)
        // GET: api/Messages/unread-total/{userId}
        [HttpGet("unread-total/{userId}")]
        public async Task<IActionResult> GetTotalUnread(string userId)
        {
            var count = await _context.Messages
                .CountAsync(m => m.ReceiverId == userId && !m.IsRead);

            return Ok(new { total = count });
        }
    }
}