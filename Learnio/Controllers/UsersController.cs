using Learnio.Entities;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;

namespace Learnio.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class UsersController : ControllerBase
    {
        private readonly UserManager<AppUser> _userManager;

        public UsersController(UserManager<AppUser> userManager)
        {
            _userManager = userManager;
        }

        // 1. ПОЛУЧИТЬ ПРОФИЛЬ (Имя, Фамилия, Аватарка)
        // GET: api/Users/profile?email=...
        [HttpGet("profile")]
        public async Task<IActionResult> GetProfile(string email)
        {
            var user = await _userManager.FindByEmailAsync(email);
            if (user == null) return NotFound("User not found");

            return Ok(new
            {
                firstName = user.FirstName,
                lastName = user.LastName,
                email = user.Email,
                avatarUrl = user.AvatarUrl // <--- Важно: отдаем ссылку на фото
            });
        }

        // 2. ЗАГРУЗИТЬ АВАТАРКУ
        // POST: api/Users/avatar?email=...
        [HttpPost("avatar")]
        public async Task<IActionResult> UploadAvatar(IFormFile file, [FromQuery] string email)
        {
            if (file == null || file.Length == 0)
                return BadRequest("Файл не выбран");

            // Ищем юзера
            var user = await _userManager.FindByEmailAsync(email);
            if (user == null) return NotFound("User not found");

            // --- ЛОГИКА СОХРАНЕНИЯ ФАЙЛА ---

            // 1. Путь к папке wwwroot/avatars
            var uploadsFolder = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "avatars");

            // Если папки нет - создаем
            if (!Directory.Exists(uploadsFolder))
                Directory.CreateDirectory(uploadsFolder);

            // 2. Генерируем уникальное имя (guid + имя файла), чтобы не было конфликтов
            var uniqueFileName = Guid.NewGuid().ToString() + "_" + file.FileName;
            var filePath = Path.Combine(uploadsFolder, uniqueFileName);

            // 3. Сохраняем файл на диск
            using (var stream = new FileStream(filePath, FileMode.Create))
            {
                await file.CopyToAsync(stream);
            }

            // 4. Записываем URL в базу данных
            // Слэш в начале обязателен для веба
            user.AvatarUrl = "/avatars/" + uniqueFileName;

            await _userManager.UpdateAsync(user);

            return Ok(new { message = "Avatar updated!", avatarUrl = user.AvatarUrl });
        }
    }
}