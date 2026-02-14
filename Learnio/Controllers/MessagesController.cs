using Learnio.Data;
using Microsoft.AspNetCore.Authorization; // <-- Добавь это
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Learnio.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [AllowAnonymous] // <--- 🔥 САМОЕ ГЛАВНОЕ: Отключаем проверку токена
    public class MessagesController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public MessagesController(ApplicationDbContext context)
        {
            _context = context;
        }

        // GET: api/Messages/contacts/{userId}
        [HttpGet("contacts/{userId}")]
        public async Task<IActionResult> GetContacts(string userId)
        {
            // Просто верим ID, который пришел с фронтенда
            if (string.IsNullOrEmpty(userId)) return BadRequest("UserId is required");

            // Ищем сообщения без учета регистра
            var conversations = await _context.Messages
                .Where(m => m.SenderId == userId || m.ReceiverId == userId)
                .OrderByDescending(m => m.SentAt)
                .Select(m => new { m.SenderId, m.ReceiverId })
                .ToListAsync();

            var contactIds = conversations
                .Select(m => m.SenderId == userId ? m.ReceiverId : m.SenderId)
                .Distinct()
                .ToList();

            var contacts = await _context.Users
                .Where(u => contactIds.Contains(u.Id))
                .Select(u => new
                {
                    id = u.Id,
                    name = u.FirstName + " " + u.LastName
                })
                .ToListAsync();

            return Ok(contacts);
        }

        // GET: api/Messages/history/{myId}/{interlocutorId}
        [HttpGet("history/{myId}/{interlocutorId}")]
        public async Task<IActionResult> GetHistory(string myId, string interlocutorId)
        {
            // Тоже просто берем историю по двум ID
            var messages = await _context.Messages
                .Where(m => (m.SenderId == myId && m.ReceiverId == interlocutorId) ||
                            (m.SenderId == interlocutorId && m.ReceiverId == myId))
                .OrderBy(m => m.SentAt)
                .Select(m => new
                {
                    m.Id,
                    m.Text,
                    Time = m.SentAt.ToString("HH:mm"),
                    IsMine = m.SenderId == myId
                })
                .ToListAsync();

            return Ok(messages);
        }
    }
}