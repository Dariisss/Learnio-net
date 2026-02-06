using Learnio.Dtos;
using Learnio.Entities;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;

namespace Learnio.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AuthController : ControllerBase
    {
        private readonly UserManager<AppUser> _userManager;

        public AuthController(UserManager<AppUser> userManager)
        {
            _userManager = userManager;
        }

        // --- РЕГИСТРАЦИЯ (УЖЕ ЕСТЬ) ---
        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] RegisterDto model)
        {
            var user = new AppUser
            {
                UserName = model.Email,
                Email = model.Email,
                FirstName = model.FirstName,
                LastName = model.LastName,
                AvatarUrl = ""
            };

            var result = await _userManager.CreateAsync(user, model.Password);

            if (result.Succeeded)
            {
                return Ok(new { message = "Ура! Пользователь создан." });
            }
            return BadRequest(result.Errors);
        }

        // --- НОВЫЙ МЕТОД: ВХОД (LOGIN) ---
        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginDto model)
        {
            // 1. Ищем пользователя по Email
            var user = await _userManager.FindByEmailAsync(model.Email);

            if (user == null)
            {
                return Unauthorized("Пользователь с такой почтой не найден.");
            }

            // 2. Проверяем пароль
            var isPasswordValid = await _userManager.CheckPasswordAsync(user, model.Password);

            if (!isPasswordValid)
            {
                return Unauthorized("Неверный пароль."); // Код 401
            }

            // 3. Если всё ок - возвращаем данные пользователя
            // (Позже мы тут будем выдавать секретный Токен, но пока просто вернем профиль)
            return Ok(new
            {
                message = "Вход выполнен успешно!",
                userId = user.Id,
                name = user.FirstName + " " + user.LastName
            });
        }
    }
}