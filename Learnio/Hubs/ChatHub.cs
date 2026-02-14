using Learnio.Data;
using Learnio.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;

namespace Learnio.Hubs
{
    // 🔥 ВОТ ЭТОЙ СТРОЧКИ НЕ ХВАТАЛО:
    [AllowAnonymous]
    public class ChatHub : Hub
    {
        private readonly ApplicationDbContext _context;

        public ChatHub(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task SendMessage(string senderId, string receiverId, string text)
        {
            try
            {
                // Простая валидация
                if (string.IsNullOrWhiteSpace(senderId) || string.IsNullOrWhiteSpace(receiverId) || string.IsNullOrWhiteSpace(text))
                {
                    throw new Exception("Empty data provided");
                }

                // 1. Ищем пользователей по СТРОКЕ (EF сам разберется с GUID внутри строки)
                var sender = await _context.Users.FindAsync(senderId);
                var receiver = await _context.Users.FindAsync(receiverId);

                if (sender == null || receiver == null)
                {
                    Console.WriteLine($"❌ User not found. SenderId: {senderId}, ReceiverId: {receiverId}");
                    return; // Или throw exception
                }

                // 2. Создаем сообщение
                var message = new Message
                {
                    Id = Guid.NewGuid(),
                    SenderId = sender.Id,   // Используем ID из базы
                    ReceiverId = receiver.Id,
                    Text = text,
                    SentAt = DateTime.UtcNow,
                    IsRead = false
                };

                _context.Messages.Add(message);
                await _context.SaveChangesAsync();

                // 3. Отправляем клиентам
                var senderName = $"{sender.FirstName} {sender.LastName}";
                var time = message.SentAt.ToString("HH:mm");

                await Clients.All.SendAsync("ReceiveMessage", senderId, senderName, text, time);
            }
            catch (Exception ex)
            {
                Console.WriteLine("🔥🔥 HUB EXCEPTION: " + ex.Message);
                // throw; // Лучше не выбрасывать исключение, чтобы не рвать соединение, а просто логировать
            }
        }
    }
}