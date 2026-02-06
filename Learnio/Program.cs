
using Learnio.Data;
using Learnio.Entities;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace Learnio
{
    public class Program
    {
        public static void Main(string[] args)
        {
            var builder = WebApplication.CreateBuilder(args);

            // Add services to the container.
            // 1. Получаем строку подключения, которую мы только что добавили
            var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");

            // 2. Говорим программе использовать SQL Server
            builder.Services.AddDbContext<ApplicationDbContext>(options =>
                options.UseSqlServer(connectionString));

            // 3. Подключаем систему пользователей (Identity)
            // Настраиваем простые пароли
            builder.Services.AddIdentity<AppUser, IdentityRole>(options =>
            {
                options.Password.RequireDigit = false; // Не требовать цифры
                options.Password.RequiredLength = 5;   // Минимальная длина - 5 символа
                options.Password.RequireNonAlphanumeric = false; // Не требовать спецсимволы (!@#)
                options.Password.RequireUppercase = false; // Не требовать большие буквы
                options.Password.RequireLowercase = false; // Не требовать маленькие буквы
            })
            .AddEntityFrameworkStores<ApplicationDbContext>()
            .AddDefaultTokenProviders();

            builder.Services.AddControllers();
            // Learn more about configuring Swagger/OpenAPI at https://aka.ms/aspnetcore/swashbuckle
            builder.Services.AddEndpointsApiExplorer();
            builder.Services.AddSwaggerGen();

            // Разрешаем Фронтенду (любому) стучаться к нам
            builder.Services.AddCors(options =>
            {
                options.AddPolicy("AllowAll", policy =>
                {
                    policy.AllowAnyOrigin()   // Разрешить всем (для диплома ок)
                          .AllowAnyMethod()   // GET, POST, DELETE...
                          .AllowAnyHeader();  // Любые заголовки
                });
            });

            var app = builder.Build();

            // Configure the HTTP request pipeline.
            if (app.Environment.IsDevelopment())
            {
                app.UseSwagger();
                app.UseSwaggerUI();
            }

            app.UseHttpsRedirection();

            app.UseCors("AllowAll"); // Включаем ту политику, что написали выше

            app.UseAuthorization();


            app.MapControllers();

            app.Run();
        }
    }
}
