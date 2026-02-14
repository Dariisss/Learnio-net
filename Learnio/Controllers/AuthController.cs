using Learnio.Dtos;
using Learnio.Entities;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.IdentityModel.Tokens; // Для токенов
using System.IdentityModel.Tokens.Jwt; // Для токенов
using System.Security.Claims; // Для данных внутри токена
using System.Text; // Для кодировки ключа

namespace Learnio.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AuthController : ControllerBase
    {
        private readonly UserManager<AppUser> _userManager;
        private readonly IConfiguration _configuration; // Нужно для доступа к настройкам (если потом вынесем ключ)

        public AuthController(UserManager<AppUser> userManager, IConfiguration configuration)
        {
            _userManager = userManager;
            _configuration = configuration;
        }

        // --- РЕГИСТРАЦИЯ ---
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

        // --- ВХОД (LOGIN) С ГЕНЕРАЦИЕЙ ТОКЕНА ---
        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginDto model)
        {
            // 1. Ищем пользователя
            var user = await _userManager.FindByEmailAsync(model.Email);

            // 2. Проверяем пароль
            if (user == null || !await _userManager.CheckPasswordAsync(user, model.Password))
            {
                return Unauthorized(new { message = "Неверная почта или пароль." });
            }

            // 3. 🔥 ГЕНЕРИРУЕМ ТОКЕН (САМОЕ ВАЖНОЕ) 🔥

            // Создаем "паспорт" пользователя (Claims)
            var authClaims = new List<Claim>
            {
                new Claim(ClaimTypes.Name, user.UserName), // Логин
                new Claim(ClaimTypes.NameIdentifier, user.Id), // ID пользователя (ВАЖНО ДЛЯ ЧАТА!)
                new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
            };

            // Добавляем роли (если есть)
            var userRoles = await _userManager.GetRolesAsync(user);
            foreach (var role in userRoles)
            {
                authClaims.Add(new Claim(ClaimTypes.Role, role));
            }

            // КЛЮЧ ШИФРОВАНИЯ (Тот же, что и в Program.cs!)
            var authSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes("SuperSecretKey12345678901234567890"));

            // Создаем сам токен
            var token = new JwtSecurityToken(
                issuer: null, // Упрощаем пока
                audience: null,
                expires: DateTime.Now.AddHours(3), // Токен живет 3 часа
                claims: authClaims,
                signingCredentials: new SigningCredentials(authSigningKey, SecurityAlgorithms.HmacSha256)
            );

            // 4. Возвращаем токен фронтенду
            return Ok(new
            {
                token = new JwtSecurityTokenHandler().WriteToken(token), // Вот он, наш ключик!
                expiration = token.ValidTo,
                userId = user.Id,
                name = user.FirstName + " " + user.LastName,
                avatarUrl = user.AvatarUrl
            });
        }
    }
}